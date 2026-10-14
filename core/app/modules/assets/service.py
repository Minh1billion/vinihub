import base64
import mimetypes
import uuid

from fastapi import HTTPException
from sqlalchemy import select

from app.container import storage
from app.i18n import t
from app.modules.assets.models import Asset

MAX_UPLOAD = 100 * 1024 * 1024


def check_mime(mime: str) -> None:
    if not mime.startswith(("image/", "video/")):
        raise HTTPException(415, t("asset.type"))


def check_size(size: int) -> None:
    if size > MAX_UPLOAD:
        raise HTTPException(413, t("asset.too_large"))


async def save_asset(db, ws_id, user_id, data: bytes, mime: str, source="generated", prompt=None,
                     parent_id=None, meta=None) -> Asset:
    kind = "video" if mime.startswith("video/") else "image"
    ext = (mimetypes.guess_extension(mime) or ".bin").lstrip(".")
    key = f"{ws_id}/{kind}/{uuid.uuid4()}.{ext}"
    await storage.put(key, data, mime)
    asset = Asset(workspace_id=ws_id, user_id=user_id, kind=kind, source=source,
                  object_key=key, mime=mime, size=len(data), prompt=prompt, parent_id=parent_id, meta=meta)
    db.add(asset)
    await db.flush()
    return asset


def asset_out(a: Asset) -> dict:
    return {"id": str(a.id), "user_id": str(a.user_id), "kind": a.kind, "source": a.source, "mime": a.mime, "size": a.size,
            "prompt": a.prompt, "parent_id": str(a.parent_id) if a.parent_id else None, "meta": a.meta,
            "url": storage.url(a.object_key), "created_at": a.created_at}


async def read_bytes(a: Asset) -> bytes:
    return await storage.get(a.object_key)


async def data_url(a: Asset) -> str:
    raw = await storage.get(a.object_key)
    return f"data:{a.mime};base64,{base64.b64encode(raw).decode()}"


async def get_asset(db, asset_id: uuid.UUID) -> Asset | None:
    return await db.get(Asset, asset_id)


async def assets_by_ids(db, ids: list[uuid.UUID]) -> dict[uuid.UUID, Asset]:
    if not ids:
        return {}
    rows = await db.scalars(select(Asset).where(Asset.id.in_(ids)))
    return {a.id: a for a in rows.all()}


async def list_assets(db, ws_id: uuid.UUID, kind: str | None) -> list[Asset]:
    q = select(Asset).where(Asset.workspace_id == ws_id).order_by(Asset.created_at.desc()).limit(200)
    if kind in ("image", "video"):
        q = q.where(Asset.kind == kind)
    return list((await db.scalars(q)).all())


async def get_in_workspace(db, ws_id: uuid.UUID, asset_id: uuid.UUID) -> Asset:
    asset = await db.get(Asset, asset_id)
    if not asset or asset.workspace_id != ws_id:
        raise HTTPException(404, t("asset.not_found"))
    return asset


async def own_asset(db, ws_id: uuid.UUID, asset_id: uuid.UUID | None, kind: str) -> Asset | None:
    if not asset_id:
        return None
    asset = await db.get(Asset, asset_id)
    if not asset or asset.workspace_id != ws_id or asset.kind != kind:
        raise HTTPException(400, t("gen.bad_ref", kind=kind))
    return asset


async def delete_asset(db, asset: Asset) -> None:
    await storage.delete(asset.object_key)
    await db.delete(asset)
    await db.commit()
