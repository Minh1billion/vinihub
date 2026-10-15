from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("display_name", sa.String(40), nullable=True))
    op.add_column("users", sa.Column("handle", sa.String(30), nullable=True))
    op.add_column("users", sa.Column("bio", sa.String(280), nullable=True))
    op.add_column("users", sa.Column("avatar_key", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("avatar_ver", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("onboarded_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_users_handle", "users", ["handle"], unique=True)
    op.execute("UPDATE users SET onboarded_at = now()")


def downgrade() -> None:
    op.drop_index("ix_users_handle", table_name="users")
    for column in ("onboarded_at", "avatar_ver", "avatar_key", "bio", "handle", "display_name"):
        op.drop_column("users", column)
