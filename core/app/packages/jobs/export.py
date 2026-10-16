import asyncio
import json
import logging
import os
import tempfile
import uuid

from app.i18n import t
from app.modules.assets import service as assets_svc
from app.modules.exports.graph import FPS, PROPS, Cut, Source, command, fit_size
from app.modules.jobs.registry import JobContext, job_handler
from app.shared.db import SessionLocal
from app.shared.errors import PermanentError

log = logging.getLogger("vinihub.export")

PROBE_TIMEOUT = 30.0
RENDER_TIMEOUT = 25 * 60.0


async def _probe(path: str) -> dict:
    proc = await asyncio.create_subprocess_exec(
        "ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height", "-of", "json", path,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    try:
        out, _ = await asyncio.wait_for(proc.communicate(), PROBE_TIMEOUT)
    except asyncio.TimeoutError:
        proc.kill()
        raise PermanentError(t("export.failed"))
    if proc.returncode != 0:
        raise PermanentError(t("export.failed"))
    streams = json.loads(out or b"{}").get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), None)
    if video is None:
        raise PermanentError(t("export.bad_asset"))
    return {"width": video.get("width"), "height": video.get("height"),
            "has_audio": any(s.get("codec_type") == "audio" for s in streams)}


async def _render(args: list[str]) -> None:
    proc = await asyncio.create_subprocess_exec(*args, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE)
    try:
        _, err = await asyncio.wait_for(proc.communicate(), RENDER_TIMEOUT)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.wait()
        raise PermanentError(t("export.failed"))
    if proc.returncode != 0:
        log.error("ffmpeg failed: %s", err.decode(errors="replace")[-2000:])
        raise PermanentError(t("export.failed"))


@job_handler("video.export", concurrency=1, per_workspace=1, max_attempts=1, timeout=RENDER_TIMEOUT + 300)
async def export_video(payload: dict, ctx: JobContext) -> dict | None:
    clips = payload["clips"]
    ids = list(dict.fromkeys(uuid.UUID(c["asset_id"]) for c in clips))
    async with SessionLocal() as db:
        found = await assets_svc.assets_by_ids(db, ids)
    for i in ids:
        a = found.get(i)
        if a is None or a.workspace_id != ctx.workspace_id or a.kind != "video":
            raise PermanentError(t("export.bad_asset"))

    with tempfile.TemporaryDirectory(prefix="vinihub-export-") as tmp:
        sources: dict[uuid.UUID, Source] = {}
        size = None
        for n, i in enumerate(ids):
            path = os.path.join(tmp, f"src{n}.bin")
            with open(path, "wb") as f:
                f.write(await assets_svc.read_bytes(found[i]))
            info = await _probe(path)
            sources[i] = Source(path=path, has_audio=info["has_audio"])
            if size is None:
                size = fit_size(info["width"], info["height"])

        cuts = [Cut(source=sources[uuid.UUID(c["asset_id"])], start=c["start"], trim_in=c["trim_in"],
                    duration=c["duration"], layer=c["layer"], blend=c["blend"],
                    look={p: c[p] for p in PROPS}, keys=tuple(c["keys"])) for c in clips]
        out = os.path.join(tmp, "out.mp4")
        await _render(command(cuts, out, size[0], size[1], FPS))
        if os.path.getsize(out) > assets_svc.MAX_UPLOAD:
            raise PermanentError(t("asset.too_large"))
        with open(out, "rb") as f:
            data = f.read()

    async with SessionLocal() as db:
        asset = await assets_svc.save_asset(db, ctx.workspace_id, ctx.user_id, data, "video/mp4", source="edit",
                                            parent_id=ids[0], meta={"width": size[0], "height": size[1]})
        await db.commit()
    return {"asset_id": str(asset.id)}
