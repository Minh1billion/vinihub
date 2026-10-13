import uuid

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.auth.security import COOKIE
from app.modules.workspaces.models import Workspace
from app.packages.usecases import access
from app.shared.db import get_db


async def current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User:
    return await access.authenticate(db, request.cookies.get(COOKIE))


async def workspace_ctx(
    wid: uuid.UUID, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)
) -> Workspace:
    return await access.member_workspace(db, wid, user.id)


async def owner_ctx(
    wid: uuid.UUID, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)
) -> Workspace:
    return await access.owner_workspace(db, wid, user.id)
