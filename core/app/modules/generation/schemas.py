import uuid
from typing import Literal

from pydantic import BaseModel, Field

from app.modules.catalog.schema import MAX_REFERENCES


class ImageIn(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    model: str | None = None
    aspect_ratio: str | None = Field(None, max_length=12)
    image_size: str | None = Field(None, max_length=MAX_REFERENCES)
    reference_asset_ids: list[uuid.UUID] = Field(default=[], max_length=MAX_REFERENCES)
    negative_prompt: str | None = Field(None, max_length=1000)
    quality: Literal["low", "medium", "high"] | None = None
    background: Literal["opaque", "transparent"] | None = None
    output_format: Literal["png", "jpeg", "webp"] | None = None


class VideoIn(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    model: str | None = None
    duration: int | None = Field(None, ge=1, le=300)
    resolution: str | None = Field(None, max_length=12)
    aspect_ratio: str | None = Field(None, max_length=12)
    first_frame_asset_id: uuid.UUID | None = None
    last_frame_asset_id: uuid.UUID | None = None
    reference_asset_ids: list[uuid.UUID] = Field(default=[], max_length=MAX_REFERENCES)
    motion_asset_id: uuid.UUID | None = None
    motion_mode: Literal["video", "image"] = "video"
    generate_audio: bool | None = None
    seed: int | None = Field(None, ge=0, le=2**32 - 1)
    negative_prompt: str | None = Field(None, max_length=1000)
