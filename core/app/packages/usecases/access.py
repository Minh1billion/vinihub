import uuid

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.i18n import t
from app.modules.auth import service as auth_svc
from app.modules.auth.models import User
from app.modules.auth.security import read_token
from app.modules.workspaces import service as ws_svc
from app.modules.workspaces.models import Workspace


async def authenticate(db: AsyncSession, token: str | None) -> User:
    user_id = read_token(token)
    if not user_id:
        raise HTTPException(401, t("auth.not_logged_in"))
    user = await auth_svc.get_user(db, user_id)
    if not user:
        raise HTTPException(401, t("auth.user_missing"))
    return user


async def member_workspace(db: AsyncSession, ws_id: uuid.UUID, user_id: uuid.UUID) -> Workspace:
    return await ws_svc.require_member(db, ws_id, user_id)


async def owner_workspace(db: AsyncSession, ws_id: uuid.UUID, user_id: uuid.UUID) -> Workspace:
    return await ws_svc.require_owner(db, ws_id, user_id)
