import asyncio
import uuid

from app.adapters.drivers import DRIVERS, Conn, Driver, MockDriver
from app.config import settings
from app.i18n import t
from app.modules.providers.models import Provider
from app.shared.crypto import decrypt
from app.shared.errors import GatewayError


class Gateway:
    def __init__(self) -> None:
        self._cache: dict[uuid.UUID, tuple[tuple, Driver]] = {}

    def for_provider(self, provider: Provider) -> Driver:
        stamp = (provider.updated_at, provider.driver, settings.mock_models)
        hit = self._cache.get(provider.id)
        if hit and hit[0] == stamp:
            return hit[1]
        cls = MockDriver if settings.mock_models else DRIVERS.get(provider.driver)
        driver = self._build(cls, provider)
        if hit:
            asyncio.get_running_loop().create_task(hit[1].aclose())
        self._cache[provider.id] = (stamp, driver)
        return driver

    @staticmethod
    def _build(cls: type[Driver] | None, provider: Provider) -> Driver:
        if cls is None:
            raise GatewayError(t("provider.driver_unknown", driver=provider.driver))
        return cls(Conn(name=provider.name, base_url=provider.base_url or cls.default_base_url,
                        api_key=decrypt(provider.api_key_enc), config={**cls.default_config, **(provider.config or {})}))
