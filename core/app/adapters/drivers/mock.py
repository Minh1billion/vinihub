import asyncio
import hashlib
import json
import re
import struct
import uuid
import zlib
from pathlib import Path
from typing import AsyncIterator

from app.adapters.drivers.base import IMAGE_FEATURES, RENDER_FEATURES, Conn, Driver
from app.i18n import current
from app.shared.errors import GatewayError

SAMPLE_VIDEO = Path(__file__).resolve().parents[1] / "mock_assets" / "sample.mp4"
POLLS_UNTIL_DONE = 2
LONG_SIDE = 768

REPLY = {
    "vi": (
        "### Ý tưởng mô phỏng\n\n"
        "Đây là câu trả lời giả lập, không gọi model thật. Bạn vừa nhập: “{prompt}”\n\n"
        "1. Mở đầu bằng một hình ảnh gây tò mò trong 2 giây đầu.\n"
        "2. Giữ một nhân vật và một màu chủ đạo xuyên suốt.\n"
        "3. Kết thúc bằng lời kêu gọi hành động ngắn gọn.\n\n"
        "Bấm “Tạo ảnh” hoặc “Tạo video” bên dưới để thử chuyển ý tưởng này sang studio."
    ),
    "en": (
        "### Mock idea\n\n"
        "This is a simulated reply, no real model was called. You wrote: “{prompt}”\n\n"
        "1. Open with a curious visual in the first 2 seconds.\n"
        "2. Keep one character and one dominant color throughout.\n"
        "3. End with a short call to action.\n\n"
        "Use “Create image” or “Create video” below to send this idea to the studio."
    ),
}


SKELETON = re.compile(r"Khung data: (\{.*\})")
TEMPLATE_ID = re.compile(r'"template": "([^"]+)"')
CHATTY = re.compile(r"^(cảm ơn|cam on|thanks|thank you|ok|oke)\b", re.IGNORECASE)
CHUNK = 14

ENVELOPE_REPLY = {
    "vi": {
        "template": "Đây là bản mô phỏng theo template.",
        "thanks": "Không có gì! Cần chỉnh sửa gì thêm cứ nói mình nhé.",
        "question": "Đây là câu trả lời mô phỏng cho một câu hỏi, không cần tạo nội dung theo template.",
    },
    "en": {
        "template": "Here is a simulated template result.",
        "thanks": "You're welcome! Let me know if you want any changes.",
        "question": "This is a simulated answer to a question, so no template content was needed.",
    },
}


def _envelope(system: str, prompt: str) -> str:
    skeleton = json.loads(SKELETON.search(system).group(1))
    tid = TEMPLATE_ID.search(system)
    mood = "thanks" if CHATTY.match(prompt) else "question" if prompt.endswith("?") else "template"
    kind = "template" if mood == "template" else "chat"
    data = {}
    if kind == "template":
        for key, empty in skeleton.items():
            data[key] = [f"Mô phỏng {key} 1", f"Mô phỏng {key} 2"] if isinstance(empty, list) else f"Mô phỏng {key}: {prompt}"
    reply = ENVELOPE_REPLY.get(current(), ENVELOPE_REPLY["vi"])[mood]
    return json.dumps({"kind": kind, "template": tid.group(1) if tid else "", "reply": reply, "data": data},
                      ensure_ascii=False, indent=2)


def _png(width: int, height: int, seed: bytes) -> bytes:
    h = hashlib.sha256(seed).digest()
    a, b = (h[0], h[1], h[2]), (h[3], h[4], h[5])
    rows = bytearray()
    for y in range(height):
        rows.append(0)
        ty = y / max(height - 1, 1)
        for x in range(width):
            t = (x / max(width - 1, 1) + ty) / 2
            rows += bytes(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

    def chunk(kind: bytes, data: bytes) -> bytes:
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(rows), 6))
        + chunk(b"IEND", b"")
    )


def _size(ratio: str | None) -> tuple[int, int]:
    try:
        w, h = (int(n) for n in (ratio or "1:1").split(":"))
    except ValueError:
        w, h = 1, 1
    if w >= h:
        return LONG_SIDE, max(1, LONG_SIDE * h // w)
    return max(1, LONG_SIDE * w // h), LONG_SIDE


class MockDriver(Driver):
    kinds = ("chat", "image", "video")
    needs_key = False
    image_features = IMAGE_FEATURES | RENDER_FEATURES

    def __init__(self, conn: Conn) -> None:
        super().__init__(conn)
        self._jobs: dict[str, int] = {}

    async def chat_stream(self, model: str, messages: list[dict], max_output: int = 0) -> AsyncIterator[str]:
        last = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        prompt = str(last).strip().replace("\n", " ")[:160]
        system = str(messages[0]["content"]) if messages and messages[0]["role"] == "system" else ""
        await asyncio.sleep(0.4)
        if SKELETON.search(system):
            text = _envelope(system, prompt)
            for i in range(0, len(text), CHUNK):
                await asyncio.sleep(0.03)
                yield text[i:i + CHUNK]
            return
        text = REPLY.get(current(), REPLY["vi"]).format(prompt=prompt)
        for token in text.split(" "):
            await asyncio.sleep(0.03)
            yield token + " "

    async def image(self, model, prompt, image_config, references, passthrough=None):
        await asyncio.sleep(1.5)
        width, height = _size((image_config or {}).get("aspect_ratio"))
        data = await asyncio.to_thread(_png, width, height, f"{model}|{prompt}".encode())
        return data, "image/png"

    async def video_submit(self, model: str, request: dict) -> str:
        job = f"mock-{uuid.uuid4().hex[:12]}"
        self._jobs[job] = 0
        return job

    async def video_status(self, job_id: str) -> dict:
        if job_id not in self._jobs:
            return {"status": "failed", "url": None, "error": "unknown mock job"}
        self._jobs[job_id] += 1
        if self._jobs[job_id] < POLLS_UNTIL_DONE:
            return {"status": "pending", "url": None, "error": None}
        del self._jobs[job_id]
        return {"status": "completed", "url": "mock://sample.mp4", "error": None}

    async def download(self, url: str) -> bytes:
        if not url.startswith("mock://"):
            raise GatewayError("mock gateway cannot download " + url)
        return SAMPLE_VIDEO.read_bytes()
