import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth import service as auth_svc
from app.modules.auth.models import User
from app.modules.auth.schemas import user_out
from app.modules.workspaces import service as ws_svc
from app.modules.workspaces.models import Workspace
from app.modules.workspaces.schemas import workspace_out


async def list_workspaces(db: AsyncSession, user: User) -> list[dict]:
    return [workspace_out(w, role) for w, role in await ws_svc.list_for_user(db, user.id)]


async def create_workspace(db: AsyncSession, user: User, name: str) -> dict:
    ws = await ws_svc.create_workspace(db, user.id, name.strip())
    await db.commit()
    return workspace_out(ws, ws_svc.OWNER)


async def rename_workspace(db: AsyncSession, ws: Workspace, name: str) -> dict:
    await ws_svc.rename(db, ws, name.strip())
    return workspace_out(ws, ws_svc.OWNER)


async def list_members(db: AsyncSession, ws: Workspace) -> list[dict]:
    roles = await ws_svc.member_roles(db, ws.id)
    users = await auth_svc.users_by_ids(db, list(roles))
    rows = sorted(((u, roles[u.id]) for u in users), key=lambda r: (r[1] != ws_svc.OWNER, r[0].email))
    return [{**user_out(u), "role": role} for u, role in rows]


async def remove_member(db: AsyncSession, ws: Workspace, actor: User, target_id: uuid.UUID) -> None:
    await ws_svc.remove_member(db, ws.id, actor.id, target_id)
