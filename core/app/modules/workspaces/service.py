import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.i18n import t
from app.modules.workspaces.models import Member, Workspace

OWNER = "owner"


async def create_workspace(db: AsyncSession, owner_id: uuid.UUID, name: str) -> Workspace:
    ws = Workspace(name=name, owner_id=owner_id)
    db.add(ws)
    await db.flush()
    db.add(Member(workspace_id=ws.id, user_id=owner_id, role=OWNER))
    return ws


async def get_workspace(db: AsyncSession, ws_id: uuid.UUID) -> Workspace | None:
    return await db.get(Workspace, ws_id)


async def list_for_user(db: AsyncSession, user_id: uuid.UUID) -> list[tuple[Workspace, str]]:
    q = (select(Workspace, Member.role).join(Member, Member.workspace_id == Workspace.id)
         .where(Member.user_id == user_id).order_by(Workspace.created_at))
    return [(w, role) for w, role in (await db.execute(q)).all()]


async def rename(db: AsyncSession, ws: Workspace, name: str) -> Workspace:
    ws.name = name
    await db.commit()
    return ws


async def role_of(db: AsyncSession, ws_id: uuid.UUID, user_id: uuid.UUID) -> str | None:
    member = await db.get(Member, (ws_id, user_id))
    return member.role if member else None


async def member_roles(db: AsyncSession, ws_id: uuid.UUID) -> dict[uuid.UUID, str]:
    q = select(Member.user_id, Member.role).where(Member.workspace_id == ws_id)
    return {uid: role for uid, role in (await db.execute(q)).all()}


async def require_member(db: AsyncSession, ws_id: uuid.UUID, user_id: uuid.UUID) -> Workspace:
    if await role_of(db, ws_id, user_id) is None:
        raise HTTPException(404, t("ws.not_found"))
    return await db.get(Workspace, ws_id)


async def require_owner(db: AsyncSession, ws_id: uuid.UUID, user_id: uuid.UUID) -> Workspace:
    role = await role_of(db, ws_id, user_id)
    if role is None:
        raise HTTPException(404, t("ws.not_found"))
    if role != OWNER:
        raise HTTPException(403, t("ws.owner_only"))
    return await db.get(Workspace, ws_id)


async def require_author_or_owner(db: AsyncSession, ws_id: uuid.UUID, user_id: uuid.UUID,
                                  author_id: uuid.UUID, message_key: str) -> None:
    if author_id == user_id:
        return
    if await role_of(db, ws_id, user_id) != OWNER:
        raise HTTPException(403, t(message_key))


async def add_member(db: AsyncSession, ws_id: uuid.UUID, user_id: uuid.UUID, role: str) -> None:
    if not await db.get(Member, (ws_id, user_id)):
        db.add(Member(workspace_id=ws_id, user_id=user_id, role=role))


async def remove_member(db: AsyncSession, ws_id: uuid.UUID, actor_id: uuid.UUID, target_id: uuid.UUID) -> None:
    if target_id != actor_id and await role_of(db, ws_id, actor_id) != OWNER:
        raise HTTPException(403, t("member.remove_forbidden"))
    target = await db.get(Member, (ws_id, target_id))
    if not target:
        raise HTTPException(404, t("member.not_found"))
    if target.role == OWNER:
        raise HTTPException(400, t("member.owner_locked"))
    await db.delete(target)
    await db.commit()
