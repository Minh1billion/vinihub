import uuid
from collections.abc import Callable

from fastapi import HTTPException
from sqlalchemy import delete, func, select, update

from app.config import settings
from app.i18n import t
from app.modules.chat.models import Conversation, Message
from app.modules.chat.prompts import SYSTEM
from app.shared.db import SessionLocal


def title_of(message: str) -> str:
    return " ".join(message.split())[:60] or t("conv.default_title")


def window(messages: list[dict], limit: int) -> list[dict]:
    kept: list[dict] = []
    size = 0
    for m in reversed(messages):
        size += len(m["content"])
        if size > limit and kept:
            break
        kept.append(m)
    kept.reverse()
    while len(kept) > 1 and kept[0]["role"] != "user":
        kept.pop(0)
    return kept


async def list_conversations(db, ws_id: uuid.UUID) -> list[Conversation]:
    q = (select(Conversation).where(Conversation.workspace_id == ws_id)
         .order_by(Conversation.updated_at.desc()).limit(200))
    return list((await db.scalars(q)).all())


async def get_conversation(db, ws_id: uuid.UUID, conv_id: uuid.UUID) -> Conversation:
    conv = await db.get(Conversation, conv_id)
    if not conv or conv.workspace_id != ws_id:
        raise HTTPException(404, t("conv.not_found"))
    return conv


async def list_messages(db, conv: Conversation) -> list[Message]:
    q = select(Message).where(Message.conversation_id == conv.id).order_by(Message.id)
    return list((await db.scalars(q)).all())


async def rename_conversation(db, conv: Conversation, raw_title: str) -> str:
    title = " ".join(raw_title.split())
    if not title:
        raise HTTPException(400, t("conv.title_empty"))
    await db.execute(update(Conversation).where(Conversation.id == conv.id)
                     .values(title=title, updated_at=Conversation.updated_at))
    await db.commit()
    return title


async def delete_conversation(db, conv: Conversation) -> None:
    await db.delete(conv)
    await db.commit()


async def start_turn(db, ws_id: uuid.UUID, user_id: uuid.UUID, model: str, message: str,
                     conversation_id: uuid.UUID | None, *, extra_system: str | None = None,
                     render: Callable[[str], str] | None = None) -> tuple[Conversation, bool, list[dict]]:
    created = conversation_id is None
    history: list[dict] = []
    if created:
        conv = Conversation(workspace_id=ws_id, user_id=user_id, model=model, title=title_of(message))
        db.add(conv)
        await db.commit()
    else:
        conv = await get_conversation(db, ws_id, conversation_id)
        history = [{"role": m.role, "content": render(m.content) if render and m.role == "assistant" else m.content}
                   for m in await list_messages(db, conv)]
    turn = window([*history, {"role": "user", "content": message}], settings.chat_context_chars)
    system = f"{SYSTEM}\n\n{extra_system}" if extra_system else SYSTEM
    return conv, created, [{"role": "system", "content": system}, *turn]


async def add_turn(db, conv_id: uuid.UUID, model: str, message: str, reply: str) -> bool:
    conv = await db.get(Conversation, conv_id)
    if not conv:
        return False
    conv.model = model
    conv.updated_at = func.now()
    db.add_all([
        Message(conversation_id=conv_id, role="user", content=message),
        Message(conversation_id=conv_id, role="assistant", content=reply),
    ])
    return True


async def discard(conv_id: uuid.UUID) -> None:
    async with SessionLocal() as db:
        await db.execute(delete(Conversation).where(Conversation.id == conv_id))
        await db.commit()
