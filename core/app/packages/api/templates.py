from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.templates.schema import CustomTemplateIn
from app.modules.workspaces.models import Workspace
from app.packages.api.deps import current_user, workspace_ctx
from app.packages.usecases import templates as uc
from app.shared.db import get_db

router = APIRouter(prefix="/workspaces/{wid}", tags=["templates"])


@router.get("/templates")
async def templates(ws: Workspace = Depends(workspace_ctx), db: AsyncSession = Depends(get_db)):
    return await uc.list_templates(db, ws)


@router.get("/templates/presets")
async def presets(ws: Workspace = Depends(workspace_ctx), db: AsyncSession = Depends(get_db)):
    return await uc.list_presets(db, ws)


@router.post("/templates/presets/{slug}", status_code=201)
async def add_preset(slug: str, ws: Workspace = Depends(workspace_ctx), user: User = Depends(current_user),
                     db: AsyncSession = Depends(get_db)):
    return await uc.add_preset(db, ws, user, slug)


@router.post("/templates", status_code=201)
async def create_template(body: CustomTemplateIn, ws: Workspace = Depends(workspace_ctx),
                          user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await uc.create_template(db, ws, user, body)


@router.patch("/templates/{tid}")
async def update_template(tid: str, body: CustomTemplateIn, ws: Workspace = Depends(workspace_ctx),
                          user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await uc.update_template(db, ws, user, tid, body)


@router.delete("/templates/{tid}", status_code=204)
async def delete_template(tid: str, ws: Workspace = Depends(workspace_ctx), user: User = Depends(current_user),
                          db: AsyncSession = Depends(get_db)):
    await uc.delete_template(db, ws, user, tid)
