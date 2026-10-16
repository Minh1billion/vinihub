from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.exports.schemas import VideoExportIn
from app.modules.workspaces.models import Workspace
from app.packages.api.deps import current_user, workspace_ctx
from app.packages.usecases import exports as uc
from app.shared.db import get_db

router = APIRouter(prefix="/workspaces/{wid}/exports", tags=["exports"])


@router.post("/video", status_code=202)
async def export_video(body: VideoExportIn, ws: Workspace = Depends(workspace_ctx), user: User = Depends(current_user),
                       db: AsyncSession = Depends(get_db)):
    return await uc.export_video(db, ws, user, body)
