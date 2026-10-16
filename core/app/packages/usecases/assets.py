import os
import json
import uuid

from fastapi import HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.i18n import t
from app.modules.assets import service as assets_svc
from app.modules.assets.service import asset_out
from app.modules.auth.models import User
from app.modules.workspaces import service as ws_svc
from app.modules.workspaces.models import Workspace


async def list_assets(db: AsyncSession, ws: Workspace, kind: str | None) -> list[dict]:
    return [asset_out(a) for a in await assets_svc.list_assets(db, ws.id, kind)]


def _meta(raw: str | None) -> dict | None:
    if not raw:
        return None
    try:
        value = json.loads(raw)
    except ValueError:
        return None
    if not isinstance(value, dict):
        return None
    out = {k: int(value[k]) for k in ("width", "height") if isinstance(value.get(k), (int, float)) and 0 < value[k] <= 20000}
    return out or None


async def upload_asset(db: AsyncSession, ws: Workspace, user: User, file: UploadFile,
                       parent_id: uuid.UUID | None = None, meta: str | None = None) -> dict:
    mime = file.content_type or ""
    assets_svc.check_mime(mime)
    data = await file.read()
    assets_svc.check_size(len(data))
    if parent_id:
        await assets_svc.get_in_workspace(db, ws.id, parent_id)
    name = None if parent_id else (os.path.splitext(os.path.basename(file.filename or ""))[0].strip()[:200] or None)
    asset = await assets_svc.save_asset(db, ws.id, user.id, data, mime, source="edit" if parent_id else "upload",
                                        prompt=name, parent_id=parent_id, meta=_meta(meta))
    await db.commit()
    return asset_out(asset)


async def get_asset(db: AsyncSession, ws: Workspace, asset_id: uuid.UUID) -> dict:
    return asset_out(await assets_svc.get_in_workspace(db, ws.id, asset_id))


async def read_content(db: AsyncSession, ws: Workspace, asset_id: uuid.UUID) -> tuple[bytes, str]:
    asset = await assets_svc.get_in_workspace(db, ws.id, asset_id)
    if asset.kind != "image":
        raise HTTPException(415, t("asset.type"))
    return await assets_svc.read_bytes(asset), asset.mime


async def delete_asset(db: AsyncSession, ws: Workspace, user: User, asset_id: uuid.UUID) -> None:
    asset = await assets_svc.get_in_workspace(db, ws.id, asset_id)
    await ws_svc.require_author_or_owner(db, ws.id, user.id, asset.user_id, "asset.delete_forbidden")
    await assets_svc.delete_asset(db, asset)
