import uuid

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.container import queue
from app.i18n import t
from app.modules.auth.models import User
from app.modules.jobs import registry, service
from app.modules.workspaces import service as ws_svc
from app.modules.workspaces.models import Workspace


async def get_job(db: AsyncSession, ws: Workspace, job_id: uuid.UUID) -> dict:
    return service.job_out(await service.get_in_workspace(db, ws.id, job_id))


async def cancel_job(db: AsyncSession, ws: Workspace, user: User, job_id: uuid.UUID) -> dict:
    job = await service.get_in_workspace(db, ws.id, job_id)
    if job.user_id:
        await ws_svc.require_author_or_owner(db, ws.id, user.id, job.user_id, "job.cancel_forbidden")
    if not await queue.cancel(job_id):
        raise HTTPException(409, t("job.finished"))
    await db.refresh(job)
    await registry.notify_failure(job, t("job.cancelled"))
    return service.job_out(job)
