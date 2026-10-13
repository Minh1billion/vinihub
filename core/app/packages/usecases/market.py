import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.market import service
from app.modules.market.schema import InstallIn, MarketItemIn, MarketItemPatch
from app.modules.workspaces import service as ws_svc


async def list_items(db: AsyncSession, user: User, kind: str, q: str, sort: str, mine: bool, limit: int,
                     ws_id: uuid.UUID | None) -> list[dict]:
    if ws_id is not None:
        await ws_svc.require_member(db, ws_id, user.id)
    return await service.listing(db, user.id, kind, q, sort, mine, limit, ws_id)


async def publish(db: AsyncSession, user: User, body: MarketItemIn) -> dict:
    return await service.create(db, user, body)


async def update_item(db: AsyncSession, user: User, item_id: uuid.UUID, body: MarketItemPatch) -> dict:
    return await service.edit(db, user, item_id, body)


async def delete_item(db: AsyncSession, user: User, item_id: uuid.UUID) -> None:
    await service.remove(db, user, item_id)


async def install_item(db: AsyncSession, user: User, item_id: uuid.UUID, body: InstallIn) -> dict:
    await ws_svc.require_member(db, body.workspace_id, user.id)
    return await service.install(db, user, item_id, body)
