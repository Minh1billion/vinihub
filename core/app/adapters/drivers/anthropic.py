import json
from typing import AsyncIterator

import httpx

from app.adapters.drivers.base import Driver
from app.i18n import t
from app.shared.errors import GatewayError


class AnthropicDriver(Driver):
    kinds = ("chat",)
    default_base_url = "https://api.anthropic.com/v1"
    default_config = {"max_tokens": 16384}

    def headers(self) -> dict[str, str]:
        return {"x-api-key": self.conn.api_key, "anthropic-version": "2023-06-01"}

    async def chat_stream(self, model: str, messages: list[dict], max_output: int = 0) -> AsyncIterator[str]:
        system = "\n\n".join(str(m["content"]) for m in messages if m["role"] == "system")
        turns = [{"role": m["role"], "content": m["content"]} for m in messages if m["role"] != "system"]
        limit = int(self.conn.config.get("max_tokens") or 4096)
        if max_output:
            limit = min(limit, max_output)
        body: dict = {"model": model, "messages": turns, "stream": True, "max_tokens": limit}
        if system:
            body["system"] = system
        try:
            async with self.http.stream("POST", "/messages", json=body) as r:
                if r.status_code >= 400:
                    await r.aread()
                    raise GatewayError(f"{self.conn.name} {r.status_code}: {r.text[:300]}")
                async for line in r.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    try:
                        event = json.loads(line[5:].strip())
                    except ValueError:
                        continue
                    kind = event.get("type")
                    if kind == "error":
                        raise GatewayError(str((event.get("error") or {}).get("message") or event)[:300])
                    if kind == "content_block_delta":
                        piece = (event.get("delta") or {}).get("text")
                        if piece:
                            yield piece
                    elif kind == "message_stop":
                        return
        except httpx.HTTPError as e:
            raise GatewayError(t("gw.connection", provider=self.conn.name, detail=e)) from e
