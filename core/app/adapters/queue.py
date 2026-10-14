import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.jobs import registry, service
from app.shared.db import SessionLocal


class PgQueue:
    async def enqueue(self, kind: str, payload: dict, *, workspace_id: uuid.UUID | None = None,
                      user_id: uuid.UUID | None = None, priority: int = 0, run_at: datetime | None = None,
                      dedupe_key: str | None = None, db: AsyncSession | None = None) -> uuid.UUID:
        spec = registry.spec(kind)
        fields = dict(max_attempts=spec.max_attempts, workspace_id=workspace_id, user_id=user_id,
                      priority=priority, run_at=run_at, dedupe_key=dedupe_key)
        if db is not None:
            return await service.create(db, kind, payload, **fields)
        async with SessionLocal() as own:
            job_id = await service.create(own, kind, payload, **fields)
            await own.commit()
            return job_id

    async def get(self, job_id: uuid.UUID) -> dict | None:
        async with SessionLocal() as db:
            job = await service.get(db, job_id)
            return service.job_out(job) if job else None

    async def cancel(self, job_id: uuid.UUID) -> bool:
        async with SessionLocal() as db:
            done = await service.cancel(db, job_id)
            await db.commit()
            return done
