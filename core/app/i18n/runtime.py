from contextvars import ContextVar

from starlette.datastructures import Headers
from starlette.requests import cookie_parser
from starlette.types import ASGIApp, Receive, Scope, Send

from .messages import MESSAGES

DEFAULT = "vi"
SUPPORTED = ("vi", "en")
COOKIE = "vh_lang"

_current: ContextVar[str] = ContextVar("lang", default=DEFAULT)


def current() -> str:
    return _current.get()


def use(lang: str) -> None:
    _current.set(lang if lang in SUPPORTED else DEFAULT)


def pick(cookie: str | None, accept_language: str | None) -> str:
    if cookie and cookie.split("-")[0].lower() in SUPPORTED:
        return cookie.split("-")[0].lower()
    ranked: list[tuple[float, str]] = []
    for part in (accept_language or "").split(","):
        tag, _, params = part.strip().partition(";")
        base = tag.split("-")[0].strip().lower()
        if base not in SUPPORTED:
            continue
        q = 1.0
        if params.strip().startswith("q="):
            try:
                q = float(params.strip()[2:])
            except ValueError:
                q = 0.0
        if q > 0:
            ranked.append((q, base))
    if ranked:
        return max(ranked, key=lambda r: r[0])[1]
    return DEFAULT


class LanguageMiddleware:

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return
        headers = Headers(scope=scope)
        cookie = cookie_parser(headers.get("cookie", "")).get(COOKIE)
        token = _current.set(pick(cookie, headers.get("accept-language")))
        try:
            await self.app(scope, receive, send)
        finally:
            _current.reset(token)


def t(key: str, **params) -> str:
    msg = MESSAGES[current()].get(key) or MESSAGES[DEFAULT].get(key) or key
    return msg.format(**params) if params else msg
