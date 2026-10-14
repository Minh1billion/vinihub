from dataclasses import dataclass
from typing import AsyncIterator

import httpx

from app.i18n import t
from app.shared.errors import GatewayError


IMAGE_FEATURES = frozenset({"aspect_ratio", "image_size", "references"})
RENDER_FEATURES = frozenset({"aspect_ratio", "references", "quality", "background", "output_format"})


@dataclass(frozen=True)
class Conn:
    name: str
    base_url: str
    api_key: str
    config: dict


class Driver:
    kinds: tuple[str, ...] = ()
    needs_key = True
    image_features: frozenset[str] = frozenset()
    negative_prompt = False
    default_base_url = ""
    default_config: dict = {}

    def __init__(self, conn: Conn) -> None:
        self.conn = conn
        self._client: httpx.AsyncClient | None = None

    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.conn.api_key}"}

    @property
    def http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(base_url=self.conn.base_url.rstrip("/"), timeout=180,
                                             follow_redirects=True, headers=self.headers())
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()

    def check(self, r: httpx.Response) -> dict:
        if r.status_code >= 400:
            raise GatewayError(f"{self.conn.name} {r.status_code}: {r.text[:300]}",
                               retryable=r.status_code == 429 or r.status_code >= 500)
        return r.json()

    async def request(self, method: str, path: str, **kwargs) -> dict:
        try:
            return self.check(await self.http.request(method, path, **kwargs))
        except httpx.HTTPError as e:
            raise GatewayError(t("gw.connection", provider=self.conn.name, detail=e), retryable=True) from e

    async def ping(self) -> tuple[str, str]:
        """Cheap authenticated call used to check a key. Returns (status, detail); detail never echoes the response body."""
        try:
            r = await self.http.get("/models", timeout=15)
        except httpx.HTTPError as e:
            return "error", type(e).__name__
        if r.status_code in (401, 403):
            return "invalid", f"HTTP {r.status_code}"
        if r.status_code >= 400:
            return "error", f"HTTP {r.status_code}"
        return "ok", ""

    def unsupported(self, kind: str) -> GatewayError:
        return GatewayError(t("gw.unsupported", provider=self.conn.name, kind=kind))

    async def chat_stream(self, model: str, messages: list[dict], max_output: int = 0) -> AsyncIterator[str]:
        raise self.unsupported("chat")
        yield ""

    async def image(self, model: str, prompt: str, image_config: dict, references: list[str],
                    passthrough: dict | None = None) -> tuple[bytes, str]:
        raise self.unsupported("image")

    async def video_submit(self, model: str, request: dict) -> str:
        raise self.unsupported("video")

    async def video_status(self, job_id: str) -> dict:
        raise self.unsupported("video")

    async def download(self, url: str) -> bytes:
        try:
            async with httpx.AsyncClient(timeout=300, follow_redirects=True) as c:
                r = await c.get(url)
        except httpx.HTTPError as e:
            raise GatewayError(t("gw.connection", provider=self.conn.name, detail=e), retryable=True) from e
        if r.status_code >= 400:
            raise GatewayError(t("gw.download_failed", status=r.status_code),
                               retryable=r.status_code == 429 or r.status_code >= 500)
        return r.content
