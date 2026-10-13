"""drop template preset column
Revision ID: 0004
Revises: 0003
Create Date: 2026-10-13 09:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE custom_templates DROP COLUMN IF EXISTS preset")


def downgrade() -> None:
    op.add_column("custom_templates", sa.Column("preset", sa.String(length=40), nullable=True))
