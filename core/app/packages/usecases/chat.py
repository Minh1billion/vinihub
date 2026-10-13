import uuid
from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from app.container import gateway
from app.modules.auth.models import User
from app.modules.billing.costs import COSTS
from app.modules.catalog import service as catalog_svc
from app.modules.chat import service as chat_svc
from app.modules.chat.schemas import ChatIn, conversation_out, message_out
from app.modules.chat.streaming import chat_events
from app.modules.generation import service as gen_svc
from app.modules.templates import service as template_svc
from app.modules.workspaces import service as ws_svc
from app.modules.workspaces.models import Workspace
from app.packages.usecases.billing import ensure_credits
from app.shared.db import SessionLocal


async def list_conversations(db: AsyncSession, ws: Workspace) -> list[dict]:
    return [conversation_out(c) for c in await chat_svc.list_conversations(db, ws.id)]


async def list_messages(db: AsyncSession, ws: Workspace, conv_id: uuid.UUID) -> list[dict]:
    conv = await chat_svc.get_conversation(db, ws.id, conv_id)
    return [message_out(m) for m in await chat_svc.list_messages(db, conv)]


async def _editable(db: AsyncSession, ws: Workspace, user: User, conv_id: uuid.UUID):
    conv = await chat_svc.get_conversation(db, ws.id, conv_id)
    await ws_svc.require_author_or_owner(db, ws.id, user.id, conv.user_id, "conv.edit_forbidden")
    return conv


async def rename_conversation(db: AsyncSession, ws: Workspace, user: User, conv_id: uuid.UUID, title: str) -> dict:
    conv = await _editable(db, ws, user, conv_id)
    return {"id": str(conv.id), "title": await chat_svc.rename_conversation(db, conv, title)}


async def delete_conversation(db: AsyncSession, ws: Workspace, user: User, conv_id: uuid.UUID) -> None:
    await chat_svc.delete_conversation(db, await _editable(db, ws, user, conv_id))


def _recorder(ws_id: uuid.UUID, user_id: uuid.UUID, model: str, conv_id: uuid.UUID, message: str):
    async def record(reply: str) -> None:
        async with SessionLocal() as db:
            if not await chat_svc.add_turn(db, conv_id, model, message, reply):
                return
            gen_svc.add_chat_usage(db, ws_id=ws_id, user_id=user_id, model=model,
                                   prompt=message[:500], credits=COSTS["chat"])
            await db.commit()
    return record


async def start_chat(db: AsyncSession, ws: Workspace, user: User, body: ChatIn) -> AsyncIterator[str]:
    chosen = await catalog_svc.resolve(db, "chat", body.model)
    model = chosen.model_id
    template = await template_svc.resolve(db, ws.id, body.template_id) if body.template_id else None
    await ensure_credits(db, user.id, COSTS["chat"])
    conv, created, msgs = await chat_svc.start_turn(
        db, ws.id, user.id, model, body.message, body.conversation_id,
        extra_system=template_svc.instructions(template) if template else None,
        render=None if template else template_svc.plain)
    record = _recorder(ws.id, user.id, model, conv.id, body.message)
    return chat_events(gateway.for_provider(chosen.provider), model, conv.id, created, msgs, record,
                       chosen.caps.get("max_output") or 0)
