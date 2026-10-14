import uuid

from app.modules.generation import service as gen_svc
from app.modules.jobs.registry import JobContext
from app.shared.db import SessionLocal


async def fail_generation(payload: dict, ctx: JobContext, error: str) -> None:
    async with SessionLocal() as db:
        gen = await gen_svc.get_generation(db, uuid.UUID(payload["generation_id"]))
        if gen is not None and gen.status in ("pending", "running"):
            gen_svc.mark_failed(gen, error[:500])
            await db.commit()
