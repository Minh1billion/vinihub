import json
import re
from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException
from pydantic import ValidationError

from app.config import settings
from app.i18n import t
from app.modules.templates import service as svc
from app.modules.templates.models import CustomTemplate
from app.modules.templates.schema import ID, CustomTemplateIn
from app.shared.validation import summarize


@lru_cache
def load() -> dict[str, CustomTemplateIn]:
    """One template per file in <template_presets_dir>/<slug>.json, same shape as a custom template."""
    root = Path(settings.template_presets_dir)
    result: dict[str, CustomTemplateIn] = {}
    for path in sorted(root.glob("*.json")) if root.is_dir() else []:
        if not re.fullmatch(ID[1:-1], path.stem) or len(path.stem) > 40:
            raise RuntimeError(f"{path}: file name must be a preset slug (lowercase letters, digits and _)")
        try:
            result[path.stem] = CustomTemplateIn.model_validate(json.loads(path.read_text(encoding="utf-8")))
        except ValidationError as e:
            raise RuntimeError(f"{path}: {summarize(e)}") from e
        except ValueError as e:
            raise RuntimeError(f"{path}: {e}") from e
    return result


async def listing(db, ws_id) -> list[dict]:
    have = {r.name.casefold() for r in await svc.list_custom(db, ws_id)}
    return [{"id": slug, "name": p.name, "description": p.description, "field_count": len(p.fields),
             "added": p.name.casefold() in have} for slug, p in load().items()]


async def add(db, ws_id, user_id, slug: str) -> CustomTemplate:
    body = load().get(slug)
    if body is None:
        raise HTTPException(404, t("template.preset_not_found", preset=slug))
    if body.name.casefold() in {r.name.casefold() for r in await svc.list_custom(db, ws_id)}:
        raise HTTPException(409, t("template.preset_added", name=body.name))
    return await svc.create_custom(db, ws_id, user_id, body)
