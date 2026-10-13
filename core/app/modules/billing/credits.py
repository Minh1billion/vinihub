import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.i18n import t
from app.modules.billing.models import Plan, Subscription


async def plan_of(db: AsyncSession, user_id: uuid.UUID) -> Plan:
    sub = await db.scalar(select(Subscription).where(Subscription.user_id == user_id))
    return await db.get(Plan, sub.plan_id if sub else "free")


def period_start() -> datetime:
    return datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def check_credits(plan: Plan, used: int, cost: int) -> None:
    if used + cost > plan.monthly_credits:
        raise HTTPException(402, t("credits.exhausted"))
