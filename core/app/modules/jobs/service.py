import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.i18n import current as current_lang
from app.i18n import t
from app.modules.jobs.models import Job
from app.shared.db import SessionLocal

ACTIVE = ("queued", "running")

CLAIM = text("""
WITH busy AS (
    SELECT workspace_id, count(*) AS n
    FROM jobs
    WHERE kind = :kind AND status = 'running' AND workspace_id IS NOT NULL
    GROUP BY workspace_id
), pick AS (
    SELECT j.id
    FROM jobs j
    LEFT JOIN busy b ON b.workspace_id = j.workspace_id
    WHERE j.kind = :kind
      AND j.status = 'queued'
      AND j.run_at <= now()
      AND (CAST(:ws_limit AS integer) <= 0 OR j.workspace_id IS NULL OR coalesce(b.n, 0) < CAST(:ws_limit AS integer))
    ORDER BY j.priority DESC, j.run_at ASC, j.created_at ASC
    LIMIT 1
    FOR UPDATE OF j SKIP LOCKED
)
UPDATE jobs
SET status = 'running',
    locked_by = :worker,
    locked_until = now() + make_interval(secs => CAST(:lease AS double precision)),
    attempts = attempts + 1,
    started_at = coalesce(started_at, now())
WHERE id IN (SELECT id FROM pick)
RETURNING id
""")


async def create(db: AsyncSession, kind: str, payload: dict, *, max_attempts: int, workspace_id: uuid.UUID | None,
                 user_id: uuid.UUID | None, priority: int, run_at: datetime | None,
                 dedupe_key: str | None) -> uuid.UUID:
    job_id = uuid.uuid4()
    stmt = pg_insert(Job).values(
        id=job_id, kind=kind, payload=payload, status="queued", priority=priority, attempts=0,
        max_attempts=max_attempts, run_at=run_at or func.now(), dedupe_key=dedupe_key,
        lang=current_lang(), workspace_id=workspace_id, user_id=user_id,
    )
    if dedupe_key:
        stmt = stmt.on_conflict_do_nothing(
            index_elements=["dedupe_key"], index_where=text("status in ('queued', 'running')"))
    inserted = (await db.execute(stmt.returning(Job.id))).scalar_one_or_none()
    if inserted is not None:
        return inserted
    existing = await db.scalar(select(Job.id).where(Job.dedupe_key == dedupe_key, Job.status.in_(ACTIVE)))
    if existing is None:
        raise RuntimeError("dedupe conflict without an active job")
    return existing


async def get(db: AsyncSession, job_id: uuid.UUID) -> Job | None:
    return await db.get(Job, job_id)


async def get_in_workspace(db: AsyncSession, ws_id: uuid.UUID, job_id: uuid.UUID) -> Job:
    job = await db.get(Job, job_id)
    if not job or job.workspace_id != ws_id:
        raise HTTPException(404, t("job.not_found"))
    return job


def job_out(j: Job) -> dict:
    return {"id": str(j.id), "kind": j.kind, "status": j.status, "attempts": j.attempts,
            "max_attempts": j.max_attempts, "result": j.result, "error": j.error, "created_at": j.created_at,
            "started_at": j.started_at, "finished_at": j.finished_at}


async def claim(kind: str, worker: str, lease: float, ws_limit: int) -> Job | None:
    async with SessionLocal() as db:
        job_id = (await db.execute(CLAIM, {"kind": kind, "worker": worker, "lease": float(lease),
                                           "ws_limit": int(ws_limit)})).scalar_one_or_none()
        await db.commit()
        return await db.get(Job, job_id) if job_id else None


async def extend(job_id: uuid.UUID, worker: str, lease: float) -> bool:
    async with SessionLocal() as db:
        res = await db.execute(
            update(Job)
            .where(Job.id == job_id, Job.locked_by == worker, Job.status == "running")
            .values(locked_until=func.now() + func.make_interval(0, 0, 0, 0, 0, 0, lease))
        )
        await db.commit()
        return res.rowcount == 1


async def succeed(job_id: uuid.UUID, worker: str, result: dict | None) -> bool:
    async with SessionLocal() as db:
        res = await db.execute(
            update(Job)
            .where(Job.id == job_id, Job.locked_by == worker, Job.status == "running")
            .values(status="succeeded", result=result, error=None, locked_by=None, locked_until=None,
                    finished_at=func.now())
        )
        await db.commit()
        return res.rowcount == 1


async def retry(job_id: uuid.UUID, worker: str, delay: float, error: str) -> bool:
    async with SessionLocal() as db:
        res = await db.execute(
            update(Job)
            .where(Job.id == job_id, Job.locked_by == worker, Job.status == "running")
            .values(status="queued", error=error, locked_by=None, locked_until=None,
                    run_at=func.now() + func.make_interval(0, 0, 0, 0, 0, 0, delay))
        )
        await db.commit()
        return res.rowcount == 1


async def fail(job_id: uuid.UUID, worker: str, error: str) -> bool:
    async with SessionLocal() as db:
        res = await db.execute(
            update(Job)
            .where(Job.id == job_id, Job.locked_by == worker, Job.status == "running")
            .values(status="failed", error=error, locked_by=None, locked_until=None, finished_at=func.now())
        )
        await db.commit()
        return res.rowcount == 1


async def release(job_id: uuid.UUID, worker: str) -> bool:
    async with SessionLocal() as db:
        res = await db.execute(
            update(Job)
            .where(Job.id == job_id, Job.locked_by == worker, Job.status == "running")
            .values(status="queued", attempts=Job.attempts - 1, locked_by=None, locked_until=None)
        )
        await db.commit()
        return res.rowcount == 1


async def cancel(db: AsyncSession, job_id: uuid.UUID) -> bool:
    res = await db.execute(
        update(Job)
        .where(Job.id == job_id, Job.status.in_(ACTIVE))
        .values(status="cancelled", error="cancelled", locked_by=None, locked_until=None, finished_at=func.now())
    )
    return res.rowcount == 1


async def reclaim_expired(limit: int = 50) -> list[Job]:
    exhausted: list[Job] = []
    async with SessionLocal() as db:
        rows = (await db.scalars(
            select(Job)
            .where(Job.status == "running", Job.locked_until < func.now())
            .order_by(Job.locked_until)
            .limit(limit)
            .with_for_update(skip_locked=True)
        )).all()
        for job in rows:
            job.locked_by = None
            job.locked_until = None
            if job.attempts >= job.max_attempts:
                job.status = "failed"
                job.error = "lease expired"
                job.finished_at = datetime.now(timezone.utc)
                exhausted.append(job)
            else:
                job.status = "queued"
                job.error = "lease expired"
        await db.commit()
    return exhausted


async def purge_finished(days: int) -> int:
    async with SessionLocal() as db:
        res = await db.execute(
            delete(Job).where(Job.status.in_(("succeeded", "failed", "cancelled")),
                              Job.finished_at < func.now() - func.make_interval(0, 0, 0, days))
        )
        await db.commit()
        return res.rowcount or 0
