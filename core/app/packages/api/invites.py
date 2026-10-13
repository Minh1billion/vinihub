import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.invites.schemas import InviteIn
from app.modules.workspaces.models import Workspace
from app.packages.api.deps import current_user, owner_ctx
from app.packages.usecases import invites as uc
from app.shared.db import get_db

router = APIRouter(prefix="/workspaces/{wid}/invites", tags=["invites"])
token_router = APIRouter(prefix="/invites", tags=["invites"])


@router.get("")
async def list_invites(ws: Workspace = Depends(owner_ctx), db: AsyncSession = Depends(get_db)):
    return await uc.list_invites(db, ws)


@router.post("", status_code=201)
async def create_invite(body: InviteIn, ws: Workspace = Depends(owner_ctx),
                        user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await uc.create_invite(db, ws, user, body.email)


@router.delete("/{iid}", status_code=204)
async def revoke_invite(iid: uuid.UUID, ws: Workspace = Depends(owner_ctx), db: AsyncSession = Depends(get_db)):
    await uc.revoke_invite(db, ws, iid)


@token_router.get("/{token}")
async def preview_invite(token: str, db: AsyncSession = Depends(get_db)):
    return await uc.preview_invite(db, token)


@token_router.post("/{token}/accept")
async def accept(token: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await uc.accept_invite(db, token, user)
