from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.packages.api.deps import current_user
from app.packages.usecases import catalog as uc
from app.shared.db import get_db

router = APIRouter(tags=["catalog"])


@router.get("/models")
async def models(_=Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await uc.list_models(db)
