import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db import Base, pk, ts


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Provider(Base):
    __tablename__ = "providers"
    id: Mapped[uuid.UUID] = pk()
    slug: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(80))
    driver: Mapped[str] = mapped_column(String(30))
    base_url: Mapped[str] = mapped_column(String(300), default="")
    # Mirror of the active ProviderKey's ciphertext, so the gateway keeps reading a single column.
    api_key_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = ts()
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class ProviderKey(Base):
    __tablename__ = "provider_keys"
    __table_args__ = (
        Index("uq_provider_keys_active", "provider_id", unique=True,
              postgresql_where=text("active"), sqlite_where=text("active")),
    )
    id: Mapped[uuid.UUID] = pk()
    provider_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("providers.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(80))
    key_enc: Mapped[str] = mapped_column(Text)
    key_hint: Mapped[str] = mapped_column(String(8), default="")
    active: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(10), default="unknown")
    status_detail: Mapped[str] = mapped_column(String(300), default="")
    checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = ts()
