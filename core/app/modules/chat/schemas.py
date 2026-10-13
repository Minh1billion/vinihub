import uuid

from pydantic import BaseModel, Field

from app.modules.chat.models import Conversation, Message


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    conversation_id: uuid.UUID | None = None
    model: str | None = None
    template_id: str | None = None


class RenameIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)


def conversation_out(c: Conversation) -> dict:
    return {"id": str(c.id), "title": c.title, "model": c.model, "user_id": str(c.user_id),
            "updated_at": c.updated_at.isoformat()}


def message_out(m: Message) -> dict:
    return {"id": m.id, "role": m.role, "content": m.content}
