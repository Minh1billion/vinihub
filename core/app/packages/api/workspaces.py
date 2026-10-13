import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.workspaces.models import Workspace
from app.modules.workspaces.schemas import WorkspaceIn
from app.packages.api.deps import current_user, owner_ctx, workspace_ctx
from app.packages.usecases import workspaces as uc
from app.shared.db import get_db

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("")
async def list_workspaces(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await uc.list_workspaces(db, user)


@router.post("", status_code=201)
async def create(body: WorkspaceIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await uc.create_workspace(db, user, body.name)


@router.patch("/{wid}")
async def rename(wid: uuid.UUID, body: WorkspaceIn, ws: Workspace = Depends(owner_ctx),
                 db: AsyncSession = Depends(get_db)):
    return await uc.rename_workspace(db, ws, body.name)


@router.get("/{wid}/members")
async def list_members(ws: Workspace = Depends(workspace_ctx), db: AsyncSession = Depends(get_db)):
    return await uc.list_members(db, ws)


@router.delete("/{wid}/members/{uid}", status_code=204)
async def remove_member(uid: uuid.UUID, ws: Workspace = Depends(workspace_ctx),
                        user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await uc.remove_member(db, ws, user, uid)
