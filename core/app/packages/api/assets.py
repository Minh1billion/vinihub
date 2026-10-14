import uuid

from fastapi import APIRouter, Depends, Form, Response, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.workspaces.models import Workspace
from app.packages.api.deps import current_user, workspace_ctx
from app.packages.usecases import assets as uc
from app.shared.db import get_db

router = APIRouter(prefix="/workspaces/{wid}/assets", tags=["assets"])


@router.get("")
async def list_assets(kind: str | None = None, ws: Workspace = Depends(workspace_ctx),
                      db: AsyncSession = Depends(get_db)):
    return await uc.list_assets(db, ws, kind)


@router.post("", status_code=201)
async def upload(file: UploadFile, parent_id: uuid.UUID | None = Form(None), meta: str | None = Form(None),
                 ws: Workspace = Depends(workspace_ctx), user: User = Depends(current_user),
                 db: AsyncSession = Depends(get_db)):
    return await uc.upload_asset(db, ws, user, file, parent_id, meta)


@router.get("/{asset_id}")
async def get_asset(asset_id: uuid.UUID, ws: Workspace = Depends(workspace_ctx), db: AsyncSession = Depends(get_db)):
    return await uc.get_asset(db, ws, asset_id)


@router.get("/{asset_id}/content")
async def asset_content(asset_id: uuid.UUID, ws: Workspace = Depends(workspace_ctx),
                        db: AsyncSession = Depends(get_db)):
    data, mime = await uc.read_content(db, ws, asset_id)
    return Response(content=data, media_type=mime, headers={"Cache-Control": "private, max-age=300"})


@router.delete("/{asset_id}", status_code=204)
async def delete_asset(asset_id: uuid.UUID, ws: Workspace = Depends(workspace_ctx),
                       user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await uc.delete_asset(db, ws, user, asset_id)
