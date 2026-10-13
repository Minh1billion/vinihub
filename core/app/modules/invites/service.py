import re
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.i18n import t
from app.modules.invites.models import Invite
from app.modules.invites.schemas import aware
from app.modules.invites.tokens import INVITE_TTL, hash_token, mask_email, new_token

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MAX_PENDING = 20


def now() -> datetime:
    return datetime.now(timezone.utc)


def pending(wid: uuid.UUID):
    return select(Invite).where(Invite.workspace_id == wid, Invite.accepted_at.is_(None),
                                Invite.expires_at > now())


def normalize_email(raw_email: str) -> str:
    email = raw_email.strip().lower()
    if len(email) > 255 or not EMAIL_RE.match(email):
        raise HTTPException(422, t("invite.email_invalid"))
    return email


async def list_pending(db: AsyncSession, ws_id: uuid.UUID) -> list[Invite]:
    rows = await db.scalars(pending(ws_id).order_by(Invite.created_at.desc()))
    return list(rows.all())


async def issue_invite(db: AsyncSession, ws_id: uuid.UUID, inviter_id: uuid.UUID, email: str) -> tuple[Invite, str]:
    inv = await db.scalar(select(Invite).where(
        Invite.workspace_id == ws_id, Invite.email == email, Invite.accepted_at.is_(None)))
    if inv is None:
        count = await db.scalar(select(func.count()).select_from(pending(ws_id).subquery()))
        if count >= MAX_PENDING:
            raise HTTPException(400, t("invite.too_many", max=MAX_PENDING))
        inv = Invite(workspace_id=ws_id, email=email, invited_by=inviter_id)
        db.add(inv)
    token, inv.token_hash = new_token()
    inv.expires_at = now() + INVITE_TTL
    await db.commit()
    await db.refresh(inv)
    return inv, token


async def revoke(db: AsyncSession, ws_id: uuid.UUID, invite_id: uuid.UUID) -> None:
    inv = await db.get(Invite, invite_id)
    if not inv or inv.workspace_id != ws_id:
        raise HTTPException(404, t("invite.not_found"))
    await db.delete(inv)
    await db.commit()


async def load_valid(db: AsyncSession, token: str) -> Invite:
    inv = await db.scalar(select(Invite).where(Invite.token_hash == hash_token(token)))
    if not inv or inv.accepted_at is not None or aware(inv.expires_at) < now():
        raise HTTPException(404, t("invite.invalid"))
    return inv


def check_recipient(inv: Invite, user_email: str) -> None:
    if user_email.strip().lower() != inv.email:
        raise HTTPException(403, t("invite.wrong_account", email=mask_email(inv.email)))


def mark_accepted(inv: Invite) -> None:
    inv.accepted_at = now()
