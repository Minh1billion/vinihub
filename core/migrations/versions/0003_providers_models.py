"""providers and models in database
Revision ID: 0003
Revises: 0002
Create Date: 2026-10-12 09:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "providers",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("slug", sa.String(length=40), nullable=False),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("driver", sa.String(length=30), nullable=False),
        sa.Column("base_url", sa.String(length=300), nullable=False),
        sa.Column("api_key_enc", sa.Text(), nullable=True),
        sa.Column("config", sa.JSON(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_table(
        "models",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("provider_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(length=10), nullable=False),
        sa.Column("model_id", sa.String(length=160), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("caps", sa.JSON(), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["provider_id"], ["providers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_id", "kind", "model_id"),
    )
    op.create_index("ix_models_provider_id", "models", ["provider_id"])
    op.create_index("ix_models_kind", "models", ["kind"])
    op.add_column("generations", sa.Column("provider_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_generations_provider_id", "generations", "providers", ["provider_id"], ["id"],
                          ondelete="SET NULL")
    op.add_column("custom_templates", sa.Column("preset", sa.String(length=40), nullable=True))


def downgrade() -> None:
    op.drop_column("custom_templates", "preset")
    op.drop_constraint("fk_generations_provider_id", "generations", type_="foreignkey")
    op.drop_column("generations", "provider_id")
    op.drop_index("ix_models_kind", table_name="models")
    op.drop_index("ix_models_provider_id", table_name="models")
    op.drop_table("models")
    op.drop_table("providers")
