import base64
import json
from typing import AsyncIterator

import httpx

from app.adapters.drivers.base import RENDER_FEATURES, Driver
from app.i18n import t
from app.shared.errors import GatewayError

IMAGE_SIZES = {"1:1": "1024x1024", "3:2": "1536x1024", "2:3": "1024x1536"}
OUTPUT_MIME = {"png": "image/png", "jpeg": "image/jpeg", "webp": "image/webp"}
RENDER_OPTIONS = ("quality", "background", "output_format")


class OpenAICompatDriver(Driver):
    kinds = ("chat", "image")
    image_features = RENDER_FEATURES
    default_base_url = "https://api.openai.com/v1"

    def chat_body(self, model: str, messages: list[dict]) -> dict:
        return {"model": model, "messages": messages, "stream": True}

    async def chat_stream(self, model: str, messages: list[dict], max_output: int = 0) -> AsyncIterator[str]:
        try:
            async with self.http.stream("POST", "/chat/completions", json=self.chat_body(model, messages)) as r:
                if r.status_code >= 400:
                    await r.aread()
                    raise GatewayError(f"{self.conn.name} {r.status_code}: {r.text[:300]}")
                async for line in r.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    payload = line[5:].strip()
                    if payload == "[DONE]":
                        return
                    try:
                        chunk = json.loads(payload)
                    except ValueError:
                        continue
                    err = chunk.get("error")
                    if err:
                        raise GatewayError(str(err.get("message") if isinstance(err, dict) else err)[:300])
                    choices = chunk.get("choices") or []
                    piece = (choices[0].get("delta") or {}).get("content") if choices else None
                    if piece:
                        yield piece
        except httpx.HTTPError as e:
            raise GatewayError(t("gw.connection", provider=self.conn.name, detail=e)) from e

    @staticmethod
    def reference_file(index: int, data_url: str) -> tuple[str, tuple[str, bytes, str]]:
        head, b64 = data_url.split(",", 1)
        mime = head.split(":", 1)[1].split(";", 1)[0]
        return "image[]", (f"reference-{index}.{mime.split('/')[-1]}", base64.b64decode(b64), mime)

    async def image(self, model: str, prompt: str, image_config: dict, references: list[str],
                    passthrough: dict | None = None) -> tuple[bytes, str]:
        config = image_config or {}
        body: dict = {"model": model, "prompt": prompt, "n": 1}
        size = IMAGE_SIZES.get(config.get("aspect_ratio"))
        if size:
            body["size"] = size
        for key in RENDER_OPTIONS:
            if config.get(key):
                body[key] = config[key]
        if references:
            fields = {k: str(v) for k, v in {**body, "input_fidelity": "high"}.items()}
            files = [self.reference_file(i, u) for i, u in enumerate(references)]
            data = await self.request("POST", "/images/edits", data=fields, files=files)
        else:
            data = await self.request("POST", "/images/generations", json=body)
        item = (data.get("data") or [{}])[0]
        mime = OUTPUT_MIME.get(config.get("output_format"), "image/png")
        if item.get("b64_json"):
            return base64.b64decode(item["b64_json"]), mime
        if item.get("url"):
            return await self.download(item["url"]), mime
        raise GatewayError(t("gw.no_image"))
