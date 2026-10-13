from fastapi import HTTPException
from pydantic import Field, ValidationError
from sqlalchemy import func, select

from app.i18n import t
from app.modules.templates import service as svc
from app.modules.templates.models import CustomTemplate
from app.modules.templates.schema import MAX_CUSTOM, CustomTemplateIn, Strict
from app.shared.validation import summarize

VERSION = 1


class TemplateDoc(Strict):
    version: int = VERSION
    templates: list[CustomTemplateIn] = Field(min_length=1, max_length=MAX_CUSTOM)


def parse(raw: dict) -> TemplateDoc:
    try:
        doc = TemplateDoc.model_validate(raw)
    except ValidationError as e:
        raise HTTPException(400, t("bulk.invalid", detail=summarize(e)))
    if doc.version != VERSION:
        raise HTTPException(400, t("bulk.version", version=doc.version))
    return doc


async def export_doc(db, ws_id) -> dict:
    return {
        "version": VERSION,
        "templates": [
            {k: v for k, v in svc.custom_out(r).items() if k in ("name", "description", "fields")}
            for r in await svc.list_custom(db, ws_id)
        ],
    }


async def import_doc(db, ws_id, user_id, doc: TemplateDoc) -> dict:
    rows = await svc.list_custom(db, ws_id)
    seen = {r.name.casefold() for r in rows}
    fresh = []
    skipped = 0
    for body in doc.templates:
        key = body.name.casefold()
        if key in seen:
            skipped += 1
            continue
        seen.add(key)
        fresh.append(body)
    if len(rows) + len(fresh) > MAX_CUSTOM:
        raise HTTPException(400, t("template.limit", max=MAX_CUSTOM))
    for body in fresh:
        db.add(CustomTemplate(workspace_id=ws_id, user_id=user_id, name=body.name, description=body.description,
                              fields=svc.build_fields(body)))
    await db.commit()
    return {"added": len(fresh), "skipped": skipped}
