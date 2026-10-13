import uuid

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.container import gateway
from app.modules.assets import service as assets_svc
from app.modules.assets.service import asset_out
from app.modules.auth.models import User
from app.modules.billing.costs import COSTS
from app.modules.catalog import service as catalog_svc
from app.modules.generation import service as gen_svc
from app.modules.generation.models import Generation
from app.modules.generation.rules import check_image_request, check_video_request
from app.modules.generation.schemas import ImageIn, VideoIn
from app.modules.workspaces.models import Workspace
from app.packages.usecases.billing import ensure_credits
from app.shared.errors import GatewayError


async def view(db: AsyncSession, gen: Generation) -> dict:
    asset = await assets_svc.get_asset(db, gen.asset_id) if gen.asset_id else None
    return gen_svc.generation_out(gen, asset_out(asset) if asset else None)


async def create_image(db: AsyncSession, ws: Workspace, user: User, body: ImageIn) -> Generation:
    chosen = await catalog_svc.resolve(db, "image", body.model)
    model, caps = chosen.model_id, chosen.caps
    await ensure_credits(db, user.id, COSTS["image"])
    negative = (body.negative_prompt or "").strip()
    check_image_request(caps, aspect_ratio=body.aspect_ratio, image_size=body.image_size,
                        refs=len(body.reference_asset_ids), negative=bool(negative),
                        quality=body.quality, background=body.background, output_format=body.output_format)
    passthrough = _passthrough(caps, negative)
    refs = [await assets_svc.data_url(await assets_svc.own_asset(db, ws.id, i, "image"))
            for i in body.reference_asset_ids]
    config = {k: v for k, v in {"aspect_ratio": body.aspect_ratio, "image_size": body.image_size,
                                "quality": body.quality, "background": body.background,
                                "output_format": body.output_format}.items() if v}
    gen = await gen_svc.add_generation(db, ws_id=ws.id, user_id=user.id, kind="image", model=model,
                                       prompt=body.prompt, status="running",
                                       params={**config, "negative_prompt": negative if passthrough else None,
                                               "passthrough": passthrough},
                                       credits=COSTS["image"], provider_id=chosen.provider.id)
    try:
        data, mime = await gateway.for_provider(chosen.provider).image(gen.model, body.prompt, config, refs, passthrough)
    except GatewayError as e:
        gen_svc.mark_failed(gen, str(e))
        await db.commit()
        raise HTTPException(502, str(e))
    asset = await assets_svc.save_asset(db, ws.id, user.id, data, mime, prompt=body.prompt)
    gen_svc.mark_succeeded(gen, asset.id)
    await db.commit()
    return gen


def _passthrough(caps: dict, negative: str) -> dict | None:
    key = caps.get("negative_prompt_key")
    if not (negative and key):
        return None
    return {"providers": caps.get("passthrough_providers") or [], "parameters": {key: negative}}


def _id(value) -> str | None:
    return str(value) if value else None


async def create_video(db: AsyncSession, ws: Workspace, user: User, body: VideoIn) -> Generation:
    chosen = await catalog_svc.resolve(db, "video", body.model)
    model, caps = chosen.model_id, chosen.caps
    await ensure_credits(db, user.id, COSTS["video"])
    negative = (body.negative_prompt or "").strip()
    check_video_request(
        caps, duration=body.duration, resolution=body.resolution, aspect_ratio=body.aspect_ratio,
        first=bool(body.first_frame_asset_id), last=bool(body.last_frame_asset_id),
        refs=len(body.reference_asset_ids), motion=bool(body.motion_asset_id),
        audio=body.generate_audio, seed=body.seed, negative=bool(negative),
    )
    passthrough = _passthrough(caps, negative)

    await assets_svc.own_asset(db, ws.id, body.first_frame_asset_id, "image")
    await assets_svc.own_asset(db, ws.id, body.last_frame_asset_id, "image")
    for asset_id in body.reference_asset_ids:
        await assets_svc.own_asset(db, ws.id, asset_id, "image")
    await assets_svc.own_asset(db, ws.id, body.motion_asset_id, "video")

    gen = await gen_svc.add_generation(
        db, ws_id=ws.id, user_id=user.id, kind="video", model=model, prompt=body.prompt, status="pending",
        credits=COSTS["video"], provider_id=chosen.provider.id,
        params={"duration": body.duration, "resolution": body.resolution, "aspect_ratio": body.aspect_ratio,
                "generate_audio": body.generate_audio if caps["audio"] else None,
                "seed": body.seed if caps["seed"] else None,
                "first_frame_asset_id": _id(body.first_frame_asset_id),
                "last_frame_asset_id": _id(body.last_frame_asset_id),
                "reference_asset_ids": [str(i) for i in body.reference_asset_ids],
                "motion_mode": body.motion_mode, "motion_asset_id": _id(body.motion_asset_id),
                "negative_prompt": negative if passthrough else None, "passthrough": passthrough},
    )
    await db.commit()
    return gen


async def list_generations(db: AsyncSession, ws: Workspace, kind: str | None) -> list[dict]:
    rows = await gen_svc.list_recent(db, ws.id, kind)
    assets = await assets_svc.assets_by_ids(db, [g.asset_id for g in rows if g.asset_id])
    return [gen_svc.generation_out(g, asset_out(assets[g.asset_id]) if g.asset_id in assets else None)
            for g in rows]


async def get_generation(db: AsyncSession, ws: Workspace, gen_id: uuid.UUID) -> dict:
    return await view(db, await gen_svc.get_in_workspace(db, ws.id, gen_id))
