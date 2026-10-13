from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.providers import keys as key_svc
from app.modules.providers.models import Provider, ProviderKey
from app.modules.providers.schema import KeyIn


def _iso(value) -> str | None:
    return value.isoformat() if value else None


def _key_out(k: ProviderKey) -> dict:
    return {"id": str(k.id), "label": k.label, "hint": k.key_hint, "active": k.active, "status": k.status,
            "detail": k.status_detail, "checked_at": _iso(k.checked_at), "created_at": _iso(k.created_at)}


def _state(p: Provider, keys: list[ProviderKey]) -> str:
    if not key_svc.needs_key(p):
        return "keyless"
    active = next((k for k in keys if k.active), None)
    return "no_key" if active is None else active.status


def _out(p: Provider, keys: list[ProviderKey]) -> dict:
    return {"slug": p.slug, "name": p.name, "driver": p.driver, "base_url": p.base_url, "enabled": p.enabled,
            "state": _state(p, keys), "keys": [_key_out(k) for k in keys]}


async def _one(db: AsyncSession, provider: Provider) -> dict:
    return _out(provider, await key_svc.keys_of(db, provider))


async def list_providers(db: AsyncSession) -> list[dict]:
    providers = list(await db.scalars(select(Provider).order_by(Provider.name)))
    grouped: dict = {p.id: [] for p in providers}
    for key in await db.scalars(select(ProviderKey).order_by(ProviderKey.created_at, ProviderKey.label)):
        grouped.setdefault(key.provider_id, []).append(key)
    return [_out(p, grouped[p.id]) for p in providers]


async def add_key(db: AsyncSession, slug: str, body: KeyIn) -> dict:
    provider = await key_svc.get_provider(db, slug)
    key = await key_svc.add(db, provider, body.label, body.api_key, body.activate)
    await key_svc.check(db, provider, key)
    return await _one(db, provider)


async def activate_key(db: AsyncSession, slug: str, key_id) -> dict:
    provider = await key_svc.get_provider(db, slug)
    await key_svc.activate(db, provider, await key_svc.get_key(db, provider, key_id))
    return await _one(db, provider)


async def check_key(db: AsyncSession, slug: str, key_id) -> dict:
    provider = await key_svc.get_provider(db, slug)
    await key_svc.check(db, provider, await key_svc.get_key(db, provider, key_id))
    return await _one(db, provider)


async def delete_key(db: AsyncSession, slug: str, key_id) -> None:
    provider = await key_svc.get_provider(db, slug)
    await key_svc.remove(db, provider, await key_svc.get_key(db, provider, key_id))


async def check_all(db: AsyncSession) -> list[dict]:
    await key_svc.check_active(db)
    return await list_providers(db)
