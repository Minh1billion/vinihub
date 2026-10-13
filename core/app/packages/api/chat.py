import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.chat.schemas import ChatIn, RenameIn
from app.modules.workspaces.models import Workspace
from app.packages.api.deps import current_user, workspace_ctx
from app.packages.usecases import chat as uc
from app.shared.db import get_db

router = APIRouter(prefix="/workspaces/{wid}", tags=["chat"])


@router.get("/conversations")
async def conversations(ws: Workspace = Depends(workspace_ctx), db: AsyncSession = Depends(get_db)):
    return await uc.list_conversations(db, ws)


@router.patch("/conversations/{cid}")
async def rename_conversation(cid: uuid.UUID, body: RenameIn, ws: Workspace = Depends(workspace_ctx),
                              user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await uc.rename_conversation(db, ws, user, cid, body.title)


@router.delete("/conversations/{cid}", status_code=204)
async def delete_conversation(cid: uuid.UUID, ws: Workspace = Depends(workspace_ctx),
                              user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    await uc.delete_conversation(db, ws, user, cid)


@router.get("/conversations/{cid}/messages")
async def messages(cid: uuid.UUID, ws: Workspace = Depends(workspace_ctx), db: AsyncSession = Depends(get_db)):
    return await uc.list_messages(db, ws, cid)


@router.post("/chat")
async def chat(body: ChatIn, ws: Workspace = Depends(workspace_ctx), user: User = Depends(current_user),
               db: AsyncSession = Depends(get_db)):
    events = await uc.start_chat(db, ws, user, body)
    return StreamingResponse(events, media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})
