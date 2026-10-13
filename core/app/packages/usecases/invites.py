import logging
import uuid

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.i18n import t
from app.modules.auth import service as auth_svc
from app.modules.auth.models import User
from app.modules.invites import service as invites_svc
from app.modules.invites.mail import send_invite_email
from app.modules.invites.schemas import invite_out
from app.modules.invites.tokens import invite_link, mask_email
from app.modules.workspaces import service as ws_svc
from app.modules.workspaces.models import Workspace
from app.modules.workspaces.schemas import workspace_out

log = logging.getLogger(__name__)


async def list_invites(db: AsyncSession, ws: Workspace) -> list[dict]:
    return [invite_out(i) for i in await invites_svc.list_pending(db, ws.id)]


async def create_invite(db: AsyncSession, ws: Workspace, inviter: User, raw_email: str) -> dict:
    email = invites_svc.normalize_email(raw_email)
    existing = await auth_svc.find_by_email(db, email)
    if existing and await ws_svc.role_of(db, ws.id, existing.id) is not None:
        raise HTTPException(409, t("invite.already_member"))

    inv, token = await invites_svc.issue_invite(db, ws.id, inviter.id, email)
    link = invite_link(token)
    error = await send_invite_email(inv.email, ws.name, inviter.name or inviter.email, link)
    if error:
        log.warning("Chưa gửi được email mời tới %s (%s). Link mời: %s", inv.email, error, link)
        return {**invite_out(inv), "emailed": False, "error": error, "link": link}
    return {**invite_out(inv), "emailed": True}


async def revoke_invite(db: AsyncSession, ws: Workspace, invite_id: uuid.UUID) -> None:
    await invites_svc.revoke(db, ws.id, invite_id)


async def preview_invite(db: AsyncSession, token: str) -> dict:
    inv = await invites_svc.load_valid(db, token)
    ws = await ws_svc.get_workspace(db, inv.workspace_id)
    inviter = await auth_svc.get_user(db, inv.invited_by)
    return {"workspace": ws.name, "inviter": (inviter.name if inviter and inviter.name else t("invite.someone")),
            "email_hint": mask_email(inv.email)}


async def accept_invite(db: AsyncSession, token: str, user: User) -> dict:
    inv = await invites_svc.load_valid(db, token)
    invites_svc.check_recipient(inv, user.email)
    await ws_svc.add_member(db, inv.workspace_id, user.id, inv.role)
    invites_svc.mark_accepted(inv)
    await db.commit()
    ws = await ws_svc.get_workspace(db, inv.workspace_id)
    return workspace_out(ws, inv.role)
