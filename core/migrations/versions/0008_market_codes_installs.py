"""market item codes and per-workspace installs
Revision ID: 0008
Revises: 0007
Create Date: 2026-10-13 19:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.modules.market.codes import new_code

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("market_items", sa.Column("code", sa.String(length=16), nullable=True))
    bind = op.get_bind()
    used: set[str] = set()
    for item_id, kind in bind.execute(sa.text("SELECT id, kind FROM market_items")).all():
        code = new_code(kind)
        while code in used:
            code = new_code(kind)
        used.add(code)
        bind.execute(sa.text("UPDATE market_items SET code = :code WHERE id = :id"), {"code": code, "id": item_id})
    op.alter_column("market_items", "code", nullable=False)
    op.create_unique_constraint("uq_market_items_code", "market_items", ["code"])
    op.create_table(
        "market_installs",
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("item_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["workspace_id"], ["workspaces.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["item_id"], ["market_items.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("workspace_id", "item_id"),
    )


def downgrade() -> None:
    op.drop_table("market_installs")
    op.drop_constraint("uq_market_items_code", "market_items", type_="unique")
    op.drop_column("market_items", "code")
