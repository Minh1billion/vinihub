import logging
import re
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.container import storage
from app.i18n import current, t
from app.modules.auth import service as auth_svc
from app.modules.auth.models import User
from app.modules.auth.names import random_name
from app.modules.auth.schemas import ProfilePatch, profile_out

log = logging.getLogger(__name__)

HANDLE = re.compile(r"[a-z0-9._]{3,30}")
MAX_AVATAR = 5 * 1024 * 1024
MIME_BY_EXT = {"png": "image/png", "jpg": "image/jpeg", "gif": "image/gif", "webp": "image/webp"}


def _sniff(data: bytes) -> str | None:
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
        return "gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


async def _drop(key: str | None) -> None:
    if not key:
        return
    try:
        await storage.delete(key)
    except Exception as exc:
        log.warning("Không xoá được ảnh đại diện cũ %s (%s)", key, exc)


def random_display_name() -> dict:
    return {"name": random_name(current())}


async def update_profile(db: AsyncSession, user: User, body: ProfilePatch) -> dict:
    sent = body.model_fields_set
    if "display_name" in sent:
        name = " ".join((body.display_name or "").split())
        if not name:
            raise HTTPException(422, t("profile.name_required"))
        user.display_name = name[:40]
    if "handle" in sent:
        handle = (body.handle or "").strip().lower().removeprefix("@")
        if handle and not HANDLE.fullmatch(handle):
            raise HTTPException(422, t("profile.handle_invalid"))
        if handle and await auth_svc.handle_taken(db, handle, user.id):
            raise HTTPException(409, t("profile.handle_taken"))
        user.handle = handle or None
    if "bio" in sent:
        user.bio = (body.bio or "").strip() or None
    if body.complete_onboarding and not user.onboarded_at:
        user.onboarded_at = datetime.now(timezone.utc)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, t("profile.handle_taken"))
    return profile_out(user)


async def set_avatar(db: AsyncSession, user: User, file: UploadFile) -> dict:
    data = await file.read(MAX_AVATAR + 1)
    if len(data) > MAX_AVATAR:
        raise HTTPException(413, t("profile.avatar_too_large"))
    ext = _sniff(data)
    if not ext:
        raise HTTPException(415, t("profile.avatar_type"))
    key = f"avatars/{user.id}/{uuid.uuid4()}.{ext}"
    await storage.put(key, data, MIME_BY_EXT[ext])
    old = user.avatar_key
    user.avatar_key = key
    user.avatar_ver = (user.avatar_ver or 0) + 1
    await db.commit()
    await _drop(old)
    return profile_out(user)


async def clear_avatar(db: AsyncSession, user: User) -> dict:
    old = user.avatar_key
    user.avatar_key = None
    user.avatar_ver = (user.avatar_ver or 0) + 1
    await db.commit()
    await _drop(old)
    return profile_out(user)


async def read_avatar(db: AsyncSession, user_id: uuid.UUID) -> Response:
    owner = await auth_svc.get_user(db, user_id)
    if not owner or not owner.avatar_key:
        raise HTTPException(404, t("profile.no_avatar"))
    data = await storage.get(owner.avatar_key)
    mime = MIME_BY_EXT.get(owner.avatar_key.rsplit(".", 1)[-1], "application/octet-stream")
    return Response(content=data, media_type=mime,
                    headers={"Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff"})
