import asyncio
import json
from collections.abc import Awaitable, Callable

from app.i18n import t
from app.modules.chat.service import discard
from app.shared.errors import GatewayError


def sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def chat_events(driver, model, conv_id, created, msgs, persist: Callable[[str], Awaitable[None]],
                      max_output: int = 0):
    parts: list[str] = []
    saved = False

    async def settle():
        nonlocal saved
        if saved:
            return
        saved = True
        if parts:
            await persist("".join(parts))
        elif created:
            await discard(conv_id)

    try:
        yield sse("meta", {"conversation_id": str(conv_id)})
        async for piece in driver.chat_stream(model, msgs, max_output):
            parts.append(piece)
            yield sse("delta", {"text": piece})
        if not parts:
            raise GatewayError(t("chat.empty_reply"))
        await settle()
        yield sse("done", {})
    except GatewayError as e:
        await settle()
        yield sse("error", {"message": str(e)})
    except asyncio.CancelledError:
        await asyncio.shield(settle())
        raise
