from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator, model_validator

Kind = Literal["chat", "image", "video"]

MAX_REFERENCES = 50

Ratio = Annotated[str, StringConstraints(pattern=r"^[1-9]\d{0,2}:[1-9]\d{0,2}$")]
Resolution = Annotated[str, StringConstraints(pattern=r"^(\d{3,4}p|\d{3}|\d(\.\d)?K)$")]
ReferenceCount = Annotated[int, Field(ge=0, le=MAX_REFERENCES)]
ImageQuality = Literal["low", "medium", "high"]
ImageBackground = Literal["opaque", "transparent"]
ImageFormat = Literal["png", "jpeg", "webp"]
PassthroughKey = Annotated[str, StringConstraints(pattern=r"^([A-Za-z][A-Za-z0-9_]{0,59})?$")]
ProviderSlug = Annotated[str, StringConstraints(pattern=r"^[a-z0-9][a-z0-9._-]{0,59}$")]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ChatCaps(Strict):
    context_window: int = Field(default=0, ge=0)
    max_output: int = Field(default=0, ge=0)
    vision: bool = False


class ImageCaps(Strict):
    aspect_ratios: list[Ratio] = Field(default=[], max_length=16)
    image_sizes: list[Resolution] = Field(default=[], max_length=8)
    reference_images: ReferenceCount = 0
    qualities: list[ImageQuality] = Field(default=[], max_length=3)
    backgrounds: list[ImageBackground] = Field(default=[], max_length=2)
    output_formats: list[ImageFormat] = Field(default=[], max_length=3)
    negative_prompt_key: PassthroughKey = ""
    passthrough_providers: list[ProviderSlug] = Field(default=[], max_length=8)


class VideoCaps(Strict):
    durations: list[Annotated[int, Field(ge=1, le=120)]] = Field(default=[], max_length=30)
    resolutions: list[Resolution] = Field(default=[], max_length=8)
    aspect_ratios: list[Ratio] = Field(default=[], max_length=16)
    frame_images: list[Literal["first_frame", "last_frame"]] = []
    reference_images: ReferenceCount = 0
    audio: bool = False
    seed: bool = False
    motion_control: bool = False
    negative_prompt_key: PassthroughKey = ""
    passthrough_providers: list[ProviderSlug] = Field(default=[], max_length=8)


def normalize_caps(kind: str, caps: dict) -> dict:
    if kind == "image":
        return ImageCaps.model_validate(caps).model_dump()
    if kind == "video":
        return VideoCaps.model_validate(caps).model_dump()
    return ChatCaps.model_validate(caps).model_dump()


def image_features_needed(caps: dict) -> set[str]:
    needed = set()
    if caps.get("aspect_ratios"):
        needed.add("aspect_ratio")
    if caps.get("image_sizes"):
        needed.add("image_size")
    if caps.get("reference_images"):
        needed.add("references")
    if caps.get("qualities"):
        needed.add("quality")
    if caps.get("backgrounds"):
        needed.add("background")
    if caps.get("output_formats"):
        needed.add("output_format")
    return needed


class ModelSpec(Strict):
    kind: Kind
    model_id: str = Field(min_length=1, max_length=160)
    name: str = Field(min_length=1, max_length=160)
    caps: dict = Field(default_factory=dict)
    enabled: bool = True
    is_default: bool = False

    @field_validator("model_id", "name", mode="before")
    @classmethod
    def _strip(cls, value):
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def _caps(self):
        self.caps = normalize_caps(self.kind, self.caps)
        return self
