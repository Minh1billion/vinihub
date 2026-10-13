import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db import Base, pk


class Plan(Base):
    __tablename__ = "plans"
    id: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(60))
    price_vnd: Mapped[int] = mapped_column(Integer, default=0)
    monthly_credits: Mapped[int] = mapped_column(Integer)
    features: Mapped[list] = mapped_column(JSON, default=list)


class Subscription(Base):
    __tablename__ = "subscriptions"
    id: Mapped[uuid.UUID] = pk()
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    plan_id: Mapped[str] = mapped_column(ForeignKey("plans.id"), default="free")
    status: Mapped[str] = mapped_column(String(20), default="active")
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    provider: Mapped[str | None] = mapped_column(String(30), nullable=True)
    provider_ref: Mapped[str | None] = mapped_column(String(120), nullable=True)
