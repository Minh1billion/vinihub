import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.container import billing
from app.i18n import t
from app.modules.billing.models import Plan, Subscription

FREE = "free"


def start_subscription(db: AsyncSession, user_id: uuid.UUID) -> Subscription:
    sub = Subscription(user_id=user_id, plan_id=FREE)
    db.add(sub)
    return sub


async def list_plans(db: AsyncSession) -> list[Plan]:
    return list((await db.scalars(select(Plan).order_by(Plan.price_vnd))).all())


async def checkout(db: AsyncSession, user_id: uuid.UUID, plan_id: str) -> dict:
    if not await db.get(Plan, plan_id):
        raise HTTPException(404, t("plan.not_found"))
    result = await billing.create_checkout(str(user_id), plan_id)
    if result.get("activated"):
        sub = await db.scalar(select(Subscription).where(Subscription.user_id == user_id))
        sub.plan_id, sub.provider = plan_id, result.get("provider")
        await db.commit()
    return result
