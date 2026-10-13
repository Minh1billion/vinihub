import uuid
from datetime import datetime, timedelta, timezone

import jwt

from app.config import settings

COOKIE = "vh_session"
ALGORITHM = "HS256"
SESSION_DAYS = 7


def make_token(user_id: uuid.UUID) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": exp}, settings.secret_key, algorithm=ALGORITHM)


def read_token(token: str | None) -> uuid.UUID | None:
    try:
        return uuid.UUID(jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])["sub"])
    except Exception:
        return None
