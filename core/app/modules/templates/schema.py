from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

ID = r"^[a-z][a-z0-9_]*$"
MAX_FIELDS = 12
MAX_CUSTOM = 50


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class L10n(Strict):
    vi: str = Field(min_length=1)
    en: str = Field(min_length=1)


class TemplateField(Strict):
    key: str = Field(pattern=ID)
    type: Literal["string", "list"]
    label: L10n
    hint: str = Field(min_length=1)
    send: Literal["image", "video"] | None = None


class Template(Strict):
    id: str = Field(pattern=ID)
    name: L10n
    description: L10n
    fields: list[TemplateField] = Field(min_length=1, max_length=MAX_FIELDS)

    @model_validator(mode="after")
    def _unique_keys(self):
        keys = [f.key for f in self.fields]
        if len(set(keys)) != len(keys):
            raise ValueError(f"template '{self.id}' có key trường bị trùng")
        return self


class CustomFieldIn(Strict):
    key: str | None = Field(default=None, pattern=ID, max_length=40)
    label: str = Field(min_length=1, max_length=60)
    type: Literal["string", "list"]
    hint: str = Field(default="", max_length=300)
    send: Literal["image", "video"] | None = None

    @field_validator("label", "hint", mode="before")
    @classmethod
    def _squash(cls, value):
        return " ".join(value.split()) if isinstance(value, str) else value


class CustomTemplateIn(Strict):
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=300)
    fields: list[CustomFieldIn] = Field(min_length=1, max_length=MAX_FIELDS)

    @field_validator("name", "description", mode="before")
    @classmethod
    def _squash(cls, value):
        return " ".join(value.split()) if isinstance(value, str) else value

    @model_validator(mode="after")
    def _named(self):
        if not self.name:
            raise ValueError("tên template không được để trống")
        return self
