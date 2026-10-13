from dataclasses import dataclass
from functools import lru_cache

from fastapi import HTTPException
from sqlalchemy import select

from app.config import settings
from app.i18n import t
from app.modules.catalog.schema import Kind, ModelSpec, image_features_needed
from app.modules.providers import registry
from app.modules.providers import service as provider_svc
from app.modules.providers.models import Provider

KINDS: tuple[Kind, ...] = ("chat", "image", "video")


@dataclass(frozen=True)
class Entry:
    ref: str
    slug: str
    kind: str
    model_id: str
    name: str
    caps: dict
    enabled: bool
    is_default: bool


@dataclass(frozen=True)
class Resolved:
    entry: Entry
    provider: Provider

    @property
    def model_id(self) -> str:
        return self.entry.model_id

    @property
    def caps(self) -> dict:
        return self.entry.caps


def _unsupported(driver: str, spec: ModelSpec) -> str:
    if spec.kind not in provider_svc.supported_kinds(driver):
        return f"driver {driver} does not support {spec.kind} models"
    if spec.kind == "image":
        missing = image_features_needed(spec.caps) - provider_svc.image_features(driver)
        if missing:
            return f"driver {driver} does not support image options: {', '.join(sorted(missing))}"
    if spec.kind in ("image", "video") and spec.caps.get("negative_prompt_key"):
        if not provider_svc.negative_prompt(driver):
            return f"driver {driver} does not support negative prompts"
        if not spec.caps.get("passthrough_providers"):
            return "negative_prompt_key needs at least one passthrough_providers slug"
    return ""


@lru_cache
def entries() -> tuple[Entry, ...]:
    """Models are declared inside each provider file, in providers_dir order."""
    result: list[Entry] = []
    for provider in registry.load():
        where = f"{settings.providers_dir}/{provider.slug}.json"
        seen: set[str] = set()
        for spec in provider.models:
            problem = _unsupported(provider.driver, spec) or (f"duplicate model {spec.model_id}" if spec.model_id in seen else "")
            if problem:
                raise RuntimeError(f"{where}: {spec.model_id}: {problem}")
            seen.add(spec.model_id)
            result.append(Entry(f"{provider.slug}:{spec.model_id}", provider.slug, spec.kind, spec.model_id, spec.name,
                                spec.caps, spec.enabled, spec.is_default))
    return tuple(result)


async def _ready(db, kind: str | None = None) -> list[tuple[Entry, Provider]]:
    providers = {p.slug: p for p in await db.scalars(select(Provider).where(Provider.enabled.is_(True)))
                 if provider_svc.ready(p)}
    return [(e, providers[e.slug]) for e in entries()
            if e.enabled and e.slug in providers and (not kind or e.kind == kind)]


def _default(rows: list[tuple[Entry, Provider]]) -> Entry | None:
    return next((e for e, _ in rows if e.is_default), rows[0][0] if rows else None)


def _public(e: Entry, p: Provider) -> dict:
    return {"id": e.ref, "model_id": e.model_id, "name": e.name, "caps": e.caps,
            "provider": {"slug": p.slug, "name": p.name, "driver": p.driver}}


async def catalog(db) -> dict:
    rows = await _ready(db)
    result: dict = {"defaults": {}}
    for kind in KINDS:
        of_kind = [(e, p) for e, p in rows if e.kind == kind]
        result[kind] = [_public(e, p) for e, p in of_kind]
        default = _default(of_kind)
        result["defaults"][kind] = default.ref if default else None
    return result


async def resolve(db, kind: Kind, ref: str | None) -> Resolved:
    rows = await _ready(db, kind)
    if not rows:
        raise HTTPException(503, t("model.not_configured", kind=kind))
    if not ref:
        wanted = _default(rows)
        return Resolved(wanted, next(p for e, p in rows if e is wanted))
    found = next(((e, p) for e, p in rows if e.ref == ref), None)
    if not found:
        raise HTTPException(400, t("model.not_allowed", model=ref))
    return Resolved(*found)
