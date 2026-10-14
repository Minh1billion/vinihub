import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.workspaces.models import Workspace
from app.packages.api.deps import current_user, workspace_ctx
from app.packages.usecases import jobs as uc
from app.shared.db import get_db

router = APIRouter(prefix="/workspaces/{wid}/jobs", tags=["jobs"])


@router.get("/{job_id}")
async def get_job(job_id: uuid.UUID, ws: Workspace = Depends(workspace_ctx), db: AsyncSession = Depends(get_db)):
    return await uc.get_job(db, ws, job_id)


@router.post("/{job_id}/cancel")
async def cancel_job(job_id: uuid.UUID, ws: Workspace = Depends(workspace_ctx), user: User = Depends(current_user),
                     db: AsyncSession = Depends(get_db)):
    return await uc.cancel_job(db, ws, user, job_id)
