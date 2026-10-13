import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.providers.schema import KeyIn
from app.packages.api.deps import current_user
from app.packages.usecases import providers as uc
from app.shared.db import get_db

# TODO: restrict to admins once roles exist; for now any signed-in user can manage provider keys.
router = APIRouter(prefix="/providers", tags=["providers"], dependencies=[Depends(current_user)])


@router.get("")
async def providers(db: AsyncSession = Depends(get_db)):
    return await uc.list_providers(db)


@router.post("/check")
async def check_all(db: AsyncSession = Depends(get_db)):
    return await uc.check_all(db)


@router.post("/{slug}/keys", status_code=201)
async def add_key(slug: str, body: KeyIn, db: AsyncSession = Depends(get_db)):
    return await uc.add_key(db, slug, body)


@router.post("/{slug}/keys/{key_id}/activate")
async def activate_key(slug: str, key_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await uc.activate_key(db, slug, key_id)


@router.post("/{slug}/keys/{key_id}/check")
async def check_key(slug: str, key_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await uc.check_key(db, slug, key_id)


@router.delete("/{slug}/keys/{key_id}", status_code=204)
async def delete_key(slug: str, key_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await uc.delete_key(db, slug, key_id)
