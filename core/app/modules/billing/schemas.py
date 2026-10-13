from pydantic import BaseModel

from app.modules.billing.models import Plan
from app.modules.billing.plan_text import localize_plan


class CheckoutIn(BaseModel):
    plan_id: str


def plan_out(p: Plan) -> dict:
    name, features = localize_plan(p.id, p.name, p.features)
    return {"id": p.id, "name": name, "price_vnd": p.price_vnd,
            "monthly_credits": p.monthly_credits, "features": features}
