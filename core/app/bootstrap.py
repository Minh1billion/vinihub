import importlib

from app.container import storage
from app.modules.catalog import service as catalog
from app.modules.billing.plans import seed_plans
from app.modules.providers import registry
from app.modules.templates import presets
from app.shared.db import SessionLocal


importlib.import_module("app.models")


async def startup() -> None:
    async with SessionLocal() as db:
        await seed_plans(db)
        await registry.sync(db)
    catalog.entries()
    presets.load()
    await storage.ensure_bucket()
