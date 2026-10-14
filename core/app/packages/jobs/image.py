import uuid

from app.container import gateway
from app.i18n import t
from app.modules.assets import service as assets_svc
from app.modules.generation import service as gen_svc
from app.modules.jobs.registry import JobContext, job_handler
from app.modules.providers.models import Provider
from app.packages.jobs.common import fail_generation
from app.shared.db import SessionLocal
from app.shared.errors import PermanentError

IMAGE_KEYS = ("aspect_ratio", "image_size", "quality", "background", "output_format")


@job_handler("image.generate", concurrency=8, per_workspace=4, max_attempts=2, timeout=300,
             on_failure=fail_generation)
async def generate_image(payload: dict, ctx: JobContext) -> dict | None:
    async with SessionLocal() as db:
        gen = await gen_svc.get_generation(db, uuid.UUID(payload["generation_id"]))
        if gen is None or gen.status in ("succeeded", "failed"):
            return None
        gen_svc.mark_running(gen)
        await db.commit()

        provider = await db.get(Provider, gen.provider_id) if gen.provider_id else None
        if provider is None:
            raise PermanentError(t("gw.provider_missing"))

        params = gen.params or {}
        config = {k: params[k] for k in IMAGE_KEYS if params.get(k)}
        ref_ids = [uuid.UUID(i) for i in params.get("reference_asset_ids") or []]
        found = await assets_svc.assets_by_ids(db, ref_ids)
        if len(found) != len(set(ref_ids)):
            raise PermanentError(t("gen.bad_ref", kind="image"))
        refs = [await assets_svc.data_url(found[i]) for i in ref_ids]

        driver = gateway.for_provider(provider)
        data, mime = await driver.image(gen.model, gen.prompt, config, refs, params.get("passthrough"))
        asset = await assets_svc.save_asset(db, gen.workspace_id, gen.user_id, data, mime, prompt=gen.prompt)
        gen_svc.mark_succeeded(gen, asset.id)
        await db.commit()
        return {"asset_id": str(asset.id)}
