import uuid
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, Field

from app.i18n import t

MAX_CLIPS = 100
MAX_SOURCES = 30
MAX_SECONDS = 600.0
MAX_LAYERS = 4
MAX_KEYS = 24
EPS = 1e-3


class LookIn(BaseModel):
    x: float = Field(0, ge=-100, le=100)
    y: float = Field(0, ge=-100, le=100)
    scale: float = Field(100, ge=10, le=300)
    rotation: float = Field(0, ge=-180, le=180)
    opacity: float = Field(100, ge=0, le=100)


class KeyIn(LookIn):
    t: float = Field(ge=0, le=MAX_SECONDS)


class ClipIn(LookIn):
    asset_id: uuid.UUID
    start: float = Field(ge=0, le=MAX_SECONDS)
    trim_in: float = Field(ge=0, le=MAX_SECONDS)
    duration: float = Field(ge=0.1, le=MAX_SECONDS)
    layer: int = Field(0, ge=0, lt=MAX_LAYERS)
    blend: Literal["normal", "multiply", "screen", "overlay", "darken", "lighten"] = "normal"
    keys: list[KeyIn] = Field(default_factory=list, max_length=MAX_KEYS)


class VideoExportIn(BaseModel):
    clips: list[ClipIn] = Field(min_length=1, max_length=MAX_CLIPS)


def ordered(clips: list[ClipIn]) -> list[ClipIn]:
    return sorted(clips, key=lambda c: c.start)


def validate_timeline(clips: list[ClipIn]) -> list[ClipIn]:
    seq = ordered(clips)
    cursors: dict[int, float] = {}
    end = 0.0
    for clip in seq:
        if clip.start < cursors.get(clip.layer, 0.0) - EPS:
            raise HTTPException(422, t("export.bad_timeline"))
        cursors[clip.layer] = clip.start + clip.duration
        end = max(end, cursors[clip.layer])
    if end > MAX_SECONDS:
        raise HTTPException(422, t("export.too_long"))
    if len({c.asset_id for c in seq}) > MAX_SOURCES:
        raise HTTPException(422, t("export.too_many_sources"))
    for clip in seq:
        keys = sorted({round(k.t, 3): k for k in clip.keys}.items())
        clip.keys = [k for _, k in keys]
    return seq
