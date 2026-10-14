"""asset parent link and metadata for edited media
Revision ID: 0009
Revises: 0008
Create Date: 2026-10-14 09:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("assets", sa.Column("parent_id", sa.Uuid(), nullable=True))
    op.add_column("assets", sa.Column("meta", sa.JSON(), nullable=True))
    op.create_foreign_key("fk_assets_parent_id", "assets", "assets", ["parent_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    op.drop_constraint("fk_assets_parent_id", "assets", type_="foreignkey")
    op.drop_column("assets", "meta")
    op.drop_column("assets", "parent_id")
