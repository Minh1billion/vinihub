from app.adapters.drivers import DRIVERS, IMAGE_FEATURES
from app.config import settings
from app.modules.providers.models import Provider
from app.modules.providers.schema import ProviderIn


def ready(p: Provider) -> bool:
    cls = DRIVERS.get(p.driver)
    if settings.mock_models:
        return True
    return cls is not None and (bool(p.api_key_enc) or not cls.needs_key)


def supported_kinds(driver: str) -> tuple[str, ...]:
    if settings.mock_models:
        return ("chat", "image", "video")
    cls = DRIVERS.get(driver)
    return cls.kinds if cls else ()


def image_features(driver: str) -> frozenset[str]:
    if settings.mock_models:
        return IMAGE_FEATURES
    cls = DRIVERS.get(driver)
    return cls.image_features if cls else frozenset()


def negative_prompt(driver: str) -> bool:
    if settings.mock_models:
        return True
    cls = DRIVERS.get(driver)
    return bool(cls and cls.negative_prompt)


def apply(p: Provider, body: ProviderIn) -> None:
    p.slug, p.name, p.driver = body.slug, body.name, body.driver
    p.base_url = body.base_url or DRIVERS[body.driver].default_base_url
    p.config, p.enabled = body.config, body.enabled
