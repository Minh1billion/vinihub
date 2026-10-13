from pydantic import BaseModel, ConfigDict, Field, field_validator

SLUG = r"^[a-z][a-z0-9_-]*$"


class ProviderIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    slug: str = Field(pattern=SLUG, max_length=40)
    name: str = Field(min_length=1, max_length=80)
    driver: str = Field(min_length=1, max_length=30)
    base_url: str = Field(default="", max_length=300)
    config: dict = Field(default_factory=dict)
    enabled: bool = True

    @field_validator("name", "base_url", mode="before")
    @classmethod
    def _strip(cls, value):
        return value.strip() if isinstance(value, str) else value


class KeyIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str = Field(default="", max_length=80)
    api_key: str = Field(min_length=1, max_length=500)
    activate: bool = False

    @field_validator("label", "api_key", mode="before")
    @classmethod
    def _strip(cls, value):
        return value.strip() if isinstance(value, str) else value
