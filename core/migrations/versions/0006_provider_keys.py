"""several encrypted keys per provider, one active
Revision ID: 0006
Revises: 0005
Create Date: 2026-10-13 15:00:00.000000
"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.shared.crypto import decrypt

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    keys = op.create_table(
        "provider_keys",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("provider_id", sa.Uuid(), nullable=False),
        sa.Column("label", sa.String(length=80), nullable=False),
        sa.Column("key_enc", sa.Text(), nullable=False),
        sa.Column("key_hint", sa.String(length=8), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(length=10), nullable=False),
        sa.Column("status_detail", sa.String(length=300), nullable=False),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["provider_id"], ["providers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_provider_keys_provider_id", "provider_keys", ["provider_id"])
    op.create_index("uq_provider_keys_active", "provider_keys", ["provider_id"], unique=True,
                    postgresql_where=sa.text("active"))
    rows = op.get_bind().execute(sa.text("SELECT id, api_key_enc FROM providers WHERE api_key_enc IS NOT NULL")).all()
    if rows:
        op.bulk_insert(keys, [{"id": uuid.uuid4(), "provider_id": pid, "label": "Default", "key_enc": enc,
                               "key_hint": decrypt(enc)[-4:], "active": True, "status": "unknown",
                               "status_detail": ""} for pid, enc in rows])


def downgrade() -> None:
    op.drop_table("provider_keys")
