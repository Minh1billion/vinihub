from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.billing.models import Plan
from app.modules.billing.plan_text import plan_seed

PLANS = [
    dict(id="free", price_vnd=0, monthly_credits=100, **plan_seed("free")),
    dict(id="pro", price_vnd=249_000, monthly_credits=2000, **plan_seed("pro")),
    dict(id="studio", price_vnd=799_000, monthly_credits=8000, **plan_seed("studio")),
]


async def seed_plans(db: AsyncSession) -> None:
    for plan in PLANS:
        await db.execute(insert(Plan).values(**plan).on_conflict_do_nothing(index_elements=["id"]))
    await db.commit()
