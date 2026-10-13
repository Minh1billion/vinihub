"""
Revision ID: 0002
Revises: 0001
Create Date: 2026-10-11 10:52:12.770894
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS "
               "updated_at timestamptz NOT NULL DEFAULT now()")
    op.execute("CREATE INDEX IF NOT EXISTS ix_conversations_updated_at "
               "ON conversations (updated_at)")


def downgrade() -> None:
    op.execute("ALTER TABLE conversations DROP COLUMN IF EXISTS updated_at")
    op.execute("DROP INDEX IF EXISTS ix_conversations_updated_at")
