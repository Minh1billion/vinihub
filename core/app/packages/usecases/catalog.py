from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog import service as catalog_svc


async def list_models(db: AsyncSession) -> dict:
    return await catalog_svc.catalog(db)
