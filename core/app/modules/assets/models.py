import uuid
from datetime import datetime

from sqlalchemy import BigInteger, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db import Base, pk, ts


class Asset(Base):
    __tablename__ = "assets"
    id: Mapped[uuid.UUID] = pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[str] = mapped_column(String(10))
    source: Mapped[str] = mapped_column(String(10), default="generated")
    object_key: Mapped[str] = mapped_column(Text)
    mime: Mapped[str] = mapped_column(String(80))
    size: Mapped[int] = mapped_column(BigInteger, default=0)
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = ts()
