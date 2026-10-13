from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.billing.schemas import CheckoutIn
from app.packages.api.deps import current_user
from app.packages.usecases import billing as uc
from app.shared.db import get_db

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/plans")
async def plans(_=Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await uc.list_plans(db)


@router.get("/subscription")
async def subscription(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await uc.subscription_overview(db, user)


@router.post("/checkout")
async def create_checkout(body: CheckoutIn, user: User = Depends(current_user),
                          db: AsyncSession = Depends(get_db)):
    return await uc.checkout(db, user, body.plan_id)
