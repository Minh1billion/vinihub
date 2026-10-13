import asyncio
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select, update

from app.adapters.drivers import DRIVERS, Conn
from app.config import settings
from app.i18n import t
from app.modules.providers.models import Provider, ProviderKey
from app.shared.crypto import decrypt, encrypt


def needs_key(provider: Provider) -> bool:
    cls = DRIVERS.get(provider.driver)
    return cls is None or cls.needs_key


async def get_provider(db, slug: str) -> Provider:
    provider = await db.scalar(select(Provider).where(Provider.slug == slug))
    if provider is None:
        raise HTTPException(404, t("provider.not_found", slug=slug))
    return provider


async def keys_of(db, provider: Provider) -> list[ProviderKey]:
    rows = await db.scalars(select(ProviderKey).where(ProviderKey.provider_id == provider.id)
                            .order_by(ProviderKey.created_at, ProviderKey.label))
    return list(rows)


async def get_key(db, provider: Provider, key_id: uuid.UUID) -> ProviderKey:
    key = await db.get(ProviderKey, key_id)
    if key is None or key.provider_id != provider.id:
        raise HTTPException(404, t("provider.key_not_found"))
    return key


async def _make_active(db, provider: Provider, key: ProviderKey) -> None:
    await db.execute(update(ProviderKey).where(ProviderKey.provider_id == provider.id, ProviderKey.active.is_(True))
                     .values(active=False))
    key.active = True
    provider.api_key_enc = key.key_enc


async def add(db, provider: Provider, label: str, api_key: str, activate: bool) -> ProviderKey:
    if not needs_key(provider) and not settings.mock_models:
        raise HTTPException(400, t("provider.no_key_needed"))
    existing = await keys_of(db, provider)
    key = ProviderKey(provider_id=provider.id, label=label or f"Key {len(existing) + 1}",
                      key_enc=encrypt(api_key), key_hint=api_key[-4:], active=False)
    db.add(key)
    if activate or not any(k.active for k in existing):
        await _make_active(db, provider, key)
    await db.commit()
    return key


async def activate(db, provider: Provider, key: ProviderKey) -> None:
    await _make_active(db, provider, key)
    await db.commit()


async def remove(db, provider: Provider, key: ProviderKey) -> None:
    if key.active:
        provider.api_key_enc = None
    await db.delete(key)
    await db.commit()


async def _ping(provider: Provider, key_enc: str) -> tuple[str, str]:
    if settings.mock_models:
        return "ok", ""
    cls = DRIVERS.get(provider.driver)
    if cls is None:
        return "error", t("provider.driver_unknown", driver=provider.driver)
    driver = cls(Conn(name=provider.name, base_url=provider.base_url or cls.default_base_url,
                      api_key=decrypt(key_enc), config={**cls.default_config, **(provider.config or {})}))
    try:
        return await driver.ping()
    finally:
        await driver.aclose()


def _store(key: ProviderKey, result: tuple[str, str]) -> None:
    key.status, key.status_detail = result
    key.checked_at = datetime.now(timezone.utc)


async def check(db, provider: Provider, key: ProviderKey) -> None:
    _store(key, await _ping(provider, key.key_enc))
    await db.commit()


async def check_active(db) -> None:
    """Check the active key of every provider that needs one, concurrently."""
    rows = (await db.execute(select(Provider, ProviderKey).join(ProviderKey, ProviderKey.provider_id == Provider.id)
                             .where(ProviderKey.active.is_(True)))).all()
    results = await asyncio.gather(*(_ping(p, k.key_enc) for p, k in rows))
    for (_, key), result in zip(rows, results):
        _store(key, result)
    await db.commit()
