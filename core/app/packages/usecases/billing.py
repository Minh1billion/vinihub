import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.billing import credits as credits_svc
from app.modules.billing import service as billing_svc
from app.modules.billing.schemas import plan_out
from app.modules.generation import service as gen_svc


async def ensure_credits(db: AsyncSession, user_id: uuid.UUID, cost: int) -> None:
    plan = await credits_svc.plan_of(db, user_id)
    used = await gen_svc.credits_used_since(db, user_id, credits_svc.period_start())
    credits_svc.check_credits(plan, used, cost)


async def list_plans(db: AsyncSession) -> list[dict]:
    return [plan_out(p) for p in await billing_svc.list_plans(db)]


async def subscription_overview(db: AsyncSession, user: User) -> dict:
    plan = await credits_svc.plan_of(db, user.id)
    used = await gen_svc.credits_used_since(db, user.id, credits_svc.period_start())
    return {"plan": plan_out(plan), "used_credits": used}


async def checkout(db: AsyncSession, user: User, plan_id: str) -> dict:
    return await billing_svc.checkout(db, user.id, plan_id)
