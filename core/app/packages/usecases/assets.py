import uuid

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.assets import service as assets_svc
from app.modules.assets.service import asset_out
from app.modules.auth.models import User
from app.modules.workspaces import service as ws_svc
from app.modules.workspaces.models import Workspace


async def list_assets(db: AsyncSession, ws: Workspace, kind: str | None) -> list[dict]:
    return [asset_out(a) for a in await assets_svc.list_assets(db, ws.id, kind)]


async def upload_asset(db: AsyncSession, ws: Workspace, user: User, file: UploadFile) -> dict:
    mime = file.content_type or ""
    assets_svc.check_mime(mime)
    data = await file.read()
    assets_svc.check_size(len(data))
    asset = await assets_svc.save_asset(db, ws.id, user.id, data, mime, source="upload")
    await db.commit()
    return asset_out(asset)


async def delete_asset(db: AsyncSession, ws: Workspace, user: User, asset_id: uuid.UUID) -> None:
    asset = await assets_svc.get_in_workspace(db, ws.id, asset_id)
    await ws_svc.require_author_or_owner(db, ws.id, user.id, asset.user_id, "asset.delete_forbidden")
    await assets_svc.delete_asset(db, asset)
