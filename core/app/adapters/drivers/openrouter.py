import base64

from app.adapters.drivers.base import IMAGE_FEATURES, Driver
from app.adapters.drivers.openai_compat import OpenAICompatDriver
from app.config import settings
from app.i18n import t
from app.shared.errors import GatewayError

DONE = {"completed", "succeeded", "success"}
FAIL = {"failed", "error", "cancelled", "canceled", "expired"}


class OpenRouterDriver(OpenAICompatDriver):
    kinds = ("chat", "image", "video")
    image_features = IMAGE_FEATURES
    negative_prompt = True
    default_base_url = "https://openrouter.ai/api/v1"
    default_config = {"video_path": "/videos"}

    def headers(self) -> dict[str, str]:
        return {**super().headers(), "HTTP-Referer": settings.app_url, "X-Title": "ViniHub"}

    @property
    def video_path(self) -> str:
        return self.conn.config.get("video_path") or "/videos"

    async def image(self, model: str, prompt: str, image_config: dict, references: list[str],
                    passthrough: dict | None = None) -> tuple[bytes, str]:
        config = image_config or {}
        body: dict = {"model": model, "prompt": prompt, "n": 1}
        if config.get("aspect_ratio"):
            body["aspect_ratio"] = config["aspect_ratio"]
        if config.get("image_size"):
            body["resolution"] = config["image_size"]
        if references:
            body["input_references"] = [{"type": "image_url", "image_url": {"url": u}} for u in references]
        body.update(self.provider_options(passthrough))
        data = await self.request("POST", "/images", json=body)
        item = (data.get("data") or [{}])[0]
        mime = item.get("media_type") or "image/png"
        if item.get("b64_json"):
            return base64.b64decode(item["b64_json"]), mime
        if item.get("url"):
            return await self.download(item["url"]), mime
        raise GatewayError(t("gw.no_image"))

    @staticmethod
    def provider_options(passthrough: dict | None) -> dict:
        if passthrough and passthrough.get("parameters") and passthrough.get("providers"):
            return {"provider": {"options": {slug: {"parameters": passthrough["parameters"]}
                                             for slug in passthrough["providers"]}}}
        return {}

    @staticmethod
    def video_body(model: str, request: dict) -> dict:
        body: dict = {"model": model, "prompt": request["prompt"]}
        for key in ("duration", "resolution", "aspect_ratio", "generate_audio", "seed"):
            if request.get(key) is not None:
                body[key] = request[key]
        frames = [{"type": "image_url", "image_url": {"url": request[key]}, "frame_type": key}
                  for key in ("first_frame", "last_frame") if request.get(key)]
        if frames:
            body["frame_images"] = frames
        elif request.get("references"):
            body["input_references"] = [{"type": "image_url", "image_url": {"url": u}} for u in request["references"]]
        body.update(OpenRouterDriver.provider_options(request.get("passthrough")))
        if request.get("motion"):
            body["motion_control"] = {"video_url": request["motion"]["video_url"],
                                      "character_orientation": request["motion"]["mode"]}
        return body

    async def video_submit(self, model: str, request: dict) -> str:
        data = await self.request("POST", self.video_path, json=self.video_body(model, request))
        return str(data.get("id") or data.get("job_id"))

    async def video_status(self, job_id: str) -> dict:
        raw = await self.request("GET", f"{self.video_path}/{job_id}")
        s = str(raw.get("status", "")).lower()
        urls = raw.get("unsigned_urls") or raw.get("urls") or []
        url = raw.get("video_url") or raw.get("url") or (urls[0] if urls else None)
        status = "completed" if s in DONE else "failed" if s in FAIL else "pending"
        error = raw.get("error")
        if status == "completed" and not url:
            status, error = "failed", t("gw.no_video_url")
        return {"status": status, "url": url, "error": error}

    async def download(self, url: str) -> bytes:
        if url.startswith(self.conn.base_url.rstrip("/")):
            r = await self.http.get(url)
            if r.status_code >= 400:
                raise GatewayError(t("gw.download_failed", status=r.status_code),
                                   retryable=r.status_code == 429 or r.status_code >= 500)
            return r.content
        return await Driver.download(self, url)
