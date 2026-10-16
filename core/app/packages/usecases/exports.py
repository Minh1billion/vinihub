from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.container import queue
from app.i18n import t
from app.modules.assets import service as assets_svc
from app.modules.auth.models import User
from app.modules.exports.schemas import VideoExportIn, validate_timeline
from app.modules.workspaces.models import Workspace


async def export_video(db: AsyncSession, ws: Workspace, user: User, body: VideoExportIn) -> dict:
    clips = validate_timeline(body.clips)
    ids = list({c.asset_id for c in clips})
    found = await assets_svc.assets_by_ids(db, ids)
    for i in ids:
        a = found.get(i)
        if a is None or a.workspace_id != ws.id or a.kind != "video":
            raise HTTPException(422, t("export.bad_asset"))
    payload = {"clips": [c.model_dump(mode="json") for c in clips]}
    job_id = await queue.enqueue("video.export", payload, workspace_id=ws.id, user_id=user.id, db=db)
    await db.commit()
    return {"job_id": str(job_id)}
