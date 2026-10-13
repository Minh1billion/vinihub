import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.market.schema import InstallIn, MarketItemIn, MarketItemPatch
from app.packages.api.deps import current_user
from app.packages.usecases import market as uc
from app.shared.db import get_db

router = APIRouter(prefix="/market", tags=["market"])


@router.get("/items")
async def items(kind: Literal["template"] = "template", q: str = Query("", max_length=100),
                sort: Literal["new", "popular"] = "new", mine: bool = False, limit: int = Query(60, ge=1, le=100),
                workspace_id: uuid.UUID | None = None, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await uc.list_items(db, user, kind, q, sort, mine, limit, workspace_id)


@router.post("/items", status_code=201)
async def publish(body: MarketItemIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await uc.publish(db, user, body)


@router.patch("/items/{item_id}")
async def update_item(item_id: uuid.UUID, body: MarketItemPatch, user: User = Depends(current_user),
                      db: AsyncSession = Depends(get_db)):
    return await uc.update_item(db, user, item_id, body)


@router.delete("/items/{item_id}", status_code=204)
async def delete_item(item_id: uuid.UUID, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await uc.delete_item(db, user, item_id)


@router.post("/items/{item_id}/install", status_code=201)
async def install_item(item_id: uuid.UUID, body: InstallIn, user: User = Depends(current_user),
                       db: AsyncSession = Depends(get_db)):
    return await uc.install_item(db, user, item_id, body)
