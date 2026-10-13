import uuid
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import func, select

from app.i18n import t
from app.modules.generation.models import Generation


async def add_generation(db, *, ws_id: uuid.UUID, user_id: uuid.UUID, kind: str, model: str, prompt: str,
                         params: dict, status: str, credits: int,
                         provider_id: uuid.UUID | None = None) -> Generation:
    gen = Generation(workspace_id=ws_id, user_id=user_id, kind=kind, model=model, prompt=prompt,
                     params=params, status=status, credits=credits, provider_id=provider_id)
    db.add(gen)
    await db.flush()
    return gen


def add_chat_usage(db, *, ws_id: uuid.UUID, user_id: uuid.UUID, model: str, prompt: str, credits: int) -> None:
    db.add(Generation(workspace_id=ws_id, user_id=user_id, kind="chat", model=model,
                      prompt=prompt, status="succeeded", credits=credits))


def mark_running(gen: Generation) -> None:
    gen.status = "running"


def mark_failed(gen: Generation, error: str) -> None:
    gen.status, gen.error = "failed", error


def mark_succeeded(gen: Generation, asset_id: uuid.UUID) -> None:
    gen.asset_id, gen.status = asset_id, "succeeded"


async def get_generation(db, gen_id: uuid.UUID) -> Generation | None:
    return await db.get(Generation, gen_id)


async def get_in_workspace(db, ws_id: uuid.UUID, gen_id: uuid.UUID) -> Generation:
    gen = await db.get(Generation, gen_id)
    if not gen or gen.workspace_id != ws_id:
        raise HTTPException(404, t("gen.not_found"))
    return gen


async def list_recent(db, ws_id: uuid.UUID, kind: str | None) -> list[Generation]:
    q = select(Generation).where(Generation.workspace_id == ws_id, Generation.kind.in_(["image", "video"]))
    if kind:
        q = q.where(Generation.kind == kind)
    return list((await db.scalars(q.order_by(Generation.created_at.desc()).limit(30))).all())


async def credits_used_since(db, user_id: uuid.UUID, since: datetime) -> int:
    q = select(func.coalesce(func.sum(Generation.credits), 0)).where(
        Generation.user_id == user_id, Generation.created_at >= since, Generation.status != "failed"
    )
    return int((await db.execute(q)).scalar_one())


def generation_out(g: Generation, asset: dict | None) -> dict:
    return {"id": str(g.id), "kind": g.kind, "status": g.status, "error": g.error, "prompt": g.prompt,
            "negative_prompt": (g.params or {}).get("negative_prompt"), "model": g.model, "asset": asset}
