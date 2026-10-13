import uuid
from typing import Literal

from pydantic import Field, field_validator

from app.modules.templates.schema import MAX_FIELDS, CustomFieldIn, Strict

MAX_PER_USER = 30
MAX_TAGS = 5
MAX_TAG_LEN = 24


class Listing(Strict):
    title: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=300)
    tags: list[str] = Field(default_factory=list, max_length=MAX_TAGS)

    @field_validator("title", "description", mode="before")
    @classmethod
    def _squash(cls, value):
        return " ".join(value.split()) if isinstance(value, str) else value

    @field_validator("tags", mode="after")
    @classmethod
    def _clean_tags(cls, tags: list[str]) -> list[str]:
        out: list[str] = []
        for tag in tags:
            tag = " ".join(tag.split()).lower()[:MAX_TAG_LEN]
            if tag and tag not in out:
                out.append(tag)
        return out


class TemplatePayload(Strict):
    fields: list[CustomFieldIn] = Field(min_length=1, max_length=MAX_FIELDS)


class MarketItemIn(Listing):
    kind: Literal["template"]
    payload: TemplatePayload


class MarketItemPatch(Listing):
    pass


class InstallIn(Strict):
    workspace_id: uuid.UUID
