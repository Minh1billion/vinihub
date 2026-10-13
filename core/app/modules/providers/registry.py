import json
import re
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, PrivateAttr, ValidationError
from sqlalchemy import select

from app.adapters.drivers import DRIVERS
from app.config import settings
from app.modules.catalog.schema import ModelSpec
from app.modules.providers import service
from app.modules.providers.models import Provider
from app.modules.providers.schema import SLUG, ProviderIn
from app.shared.validation import summarize


class Entry(BaseModel):
    """One file in <providers_dir>/<slug>.json: the provider's connection settings and its models."""
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=80)
    driver: str = Field(min_length=1, max_length=30)
    base_url: str = Field(default="", max_length=300)
    config: dict = Field(default_factory=dict)
    enabled: bool = True
    models: list[ModelSpec] = Field(default_factory=list, max_length=500)
    _slug: str = PrivateAttr(default="")

    @property
    def slug(self) -> str:
        return self._slug


@lru_cache
def load() -> tuple[Entry, ...]:
    root = Path(settings.providers_dir)
    result = []
    for path in sorted(root.glob("*.json")) if root.is_dir() else []:
        if not re.fullmatch(SLUG[1:-1], path.stem) or len(path.stem) > 40:
            raise RuntimeError(f"{path}: file name must be a provider slug (lowercase letters, digits, - and _)")
        try:
            entry = Entry.model_validate(json.loads(path.read_text(encoding="utf-8")))
        except ValidationError as e:
            raise RuntimeError(f"{path}: {summarize(e)}") from e
        except ValueError as e:
            raise RuntimeError(f"{path}: {e}") from e
        if entry.driver not in DRIVERS:
            raise RuntimeError(f"{path}: unknown driver {entry.driver}")
        entry._slug = path.stem
        result.append(entry)
    return tuple(result)


async def sync(db) -> None:
    for entry in load():
        body = ProviderIn(slug=entry.slug, name=entry.name, driver=entry.driver, base_url=entry.base_url,
                          config=entry.config, enabled=entry.enabled)
        existing = await db.scalar(select(Provider).where(Provider.slug == entry.slug))
        provider = existing or Provider()
        service.apply(provider, body)
        if existing is None:
            db.add(provider)
    await db.commit()
