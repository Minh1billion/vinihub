import asyncio
import time
import uuid

from app.container import gateway, storage
from app.i18n import t
from app.modules.assets import service as assets_svc
from app.modules.generation import service as gen_svc
from app.modules.generation.models import Generation
from app.modules.jobs.registry import JobContext, job_handler
from app.modules.providers.models import Provider
from app.packages.jobs.common import fail_generation
from app.shared.db import SessionLocal
from app.shared.errors import PermanentError

POLL_SECONDS = 5
TIMEOUT_SECONDS = 15 * 60


async def _image_url(db, asset_id: str) -> str:
    return await assets_svc.data_url(await assets_svc.get_asset(db, uuid.UUID(asset_id)))


async def _request(db, gen: Generation) -> dict:
    p = gen.params
    body: dict = {"prompt": gen.prompt}
    for key in ("duration", "resolution", "aspect_ratio", "generate_audio", "seed"):
        if p.get(key) is not None:
            body[key] = p[key]
    if p.get("passthrough"):
        body["passthrough"] = p["passthrough"]
    if p.get("first_frame_asset_id"):
        body["first_frame"] = await _image_url(db, p["first_frame_asset_id"])
    if p.get("last_frame_asset_id"):
        body["last_frame"] = await _image_url(db, p["last_frame_asset_id"])
    if p.get("reference_asset_ids"):
        body["references"] = [await _image_url(db, i) for i in p["reference_asset_ids"]]
    if p.get("motion_asset_id"):
        a = await assets_svc.get_asset(db, uuid.UUID(p["motion_asset_id"]))
        body["motion"] = {"video_url": storage.url(a.object_key, 6 * 3600), "mode": p.get("motion_mode") or "video"}
    return body


@job_handler("video.generate", concurrency=4, per_workspace=2, max_attempts=3, timeout=TIMEOUT_SECONDS + 300,
             on_failure=fail_generation)
async def generate_video(payload: dict, ctx: JobContext) -> dict | None:
    async with SessionLocal() as db:
        gen = await gen_svc.get_generation(db, uuid.UUID(payload["generation_id"]))
        if gen is None or gen.status in ("succeeded", "failed"):
            return None
        gen_svc.mark_running(gen)
        await db.commit()

        provider = await db.get(Provider, gen.provider_id) if gen.provider_id else None
        if provider is None:
            raise PermanentError(t("gw.provider_missing"))
        driver = gateway.for_provider(provider)

        if not gen.external_id:
            gen.external_id = await driver.video_submit(gen.model, await _request(db, gen))
            await db.commit()

        deadline = time.monotonic() + TIMEOUT_SECONDS
        while True:
            if time.monotonic() > deadline:
                raise PermanentError(t("video.timeout"))
            await asyncio.sleep(POLL_SECONDS)
            st = await driver.video_status(gen.external_id)
            if st["status"] == "failed":
                raise PermanentError(str(st.get("error") or t("video.failed")))
            if st["status"] == "completed":
                break

        data = await driver.download(st["url"])
        asset = await assets_svc.save_asset(db, gen.workspace_id, gen.user_id, data, "video/mp4", prompt=gen.prompt)
        gen_svc.mark_succeeded(gen, asset.id)
        await db.commit()
        return {"asset_id": str(asset.id)}
