import hashlib
import secrets
from datetime import timedelta

from app.config import settings

INVITE_TTL = timedelta(days=7)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def new_token() -> tuple[str, str]:
    token = secrets.token_urlsafe(32)
    return token, hash_token(token)


def invite_link(token: str) -> str:
    return f"{settings.app_url.rstrip('/')}/invite/{token}"


def mask_email(email: str) -> str:
    name, _, domain = email.partition("@")
    return f"{name[:1]}***@{domain}"
