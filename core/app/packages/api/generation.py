import uuid
from typing import Literal

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.generation.schemas import ImageIn, VideoIn
from app.modules.workspaces.models import Workspace
from app.packages.api.deps import current_user, workspace_ctx
from app.packages.usecases import generation as uc
from app.shared.db import get_db

router = APIRouter(prefix="/workspaces/{wid}", tags=["generation"])


@router.post("/images", status_code=202)
async def generate_image(body: ImageIn, ws: Workspace = Depends(workspace_ctx), user: User = Depends(current_user),
                         db: AsyncSession = Depends(get_db)):
    return await uc.view(db, await uc.create_image(db, ws, user, body))


@router.post("/videos", status_code=202)
async def generate_video(body: VideoIn, ws: Workspace = Depends(workspace_ctx),
                         user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await uc.view(db, await uc.create_video(db, ws, user, body))


@router.get("/generations")
async def list_generations(kind: Literal["image", "video"] | None = None, ws: Workspace = Depends(workspace_ctx),
                           db: AsyncSession = Depends(get_db)):
    return await uc.list_generations(db, ws, kind)


@router.get("/generations/{gid}")
async def get_generation(gid: uuid.UUID, ws: Workspace = Depends(workspace_ctx), db: AsyncSession = Depends(get_db)):
    return await uc.get_generation(db, ws, gid)
