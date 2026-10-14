from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "jobs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("kind", sa.String(60), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(12), nullable=False, server_default="queued"),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("run_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("locked_by", sa.String(80), nullable=True),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("dedupe_key", sa.String(200), nullable=True),
        sa.Column("lang", sa.String(5), nullable=False, server_default="vi"),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_jobs_workspace_id", "jobs", ["workspace_id"])
    op.create_index("ix_jobs_claim", "jobs", ["kind", "status", "run_at"])
    op.create_index("ix_jobs_lease", "jobs", ["status", "locked_until"])
    op.create_index("uq_jobs_dedupe_active", "jobs", ["dedupe_key"], unique=True,
                    postgresql_where=sa.text("status in ('queued', 'running')"))

    op.add_column("generations", sa.Column("job_id", sa.Uuid(), nullable=True))
    op.create_foreign_key("fk_generations_job_id", "generations", "jobs", ["job_id"], ["id"], ondelete="SET NULL")
    op.execute(
        "UPDATE generations SET status = 'failed', error = 'Interrupted by upgrade' "
        "WHERE status IN ('pending', 'running') AND job_id IS NULL"
    )


def downgrade() -> None:
    op.drop_constraint("fk_generations_job_id", "generations", type_="foreignkey")
    op.drop_column("generations", "job_id")
    op.drop_index("uq_jobs_dedupe_active", table_name="jobs")
    op.drop_index("ix_jobs_lease", table_name="jobs")
    op.drop_index("ix_jobs_claim", table_name="jobs")
    op.drop_index("ix_jobs_workspace_id", table_name="jobs")
    op.drop_table("jobs")
