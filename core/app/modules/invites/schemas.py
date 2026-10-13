from datetime import datetime, timezone

from pydantic import BaseModel

from app.modules.invites.models import Invite


class InviteIn(BaseModel):
    email: str


def aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def invite_out(i: Invite) -> dict:
    return {"id": str(i.id), "email": i.email, "role": i.role,
            "expires_at": aware(i.expires_at).isoformat(),
            "created_at": aware(i.created_at).isoformat() if i.created_at else None}
