import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db import Base, pk, ts


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = pk()
    email: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str] = mapped_column(String(255), default="")
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    google_sub: Mapped[str] = mapped_column(String(64), unique=True)
    display_name: Mapped[str | None] = mapped_column(String(40), nullable=True)
    handle: Mapped[str | None] = mapped_column(String(30), unique=True, nullable=True)
    bio: Mapped[str | None] = mapped_column(String(280), nullable=True)
    avatar_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_ver: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    onboarded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = ts()
