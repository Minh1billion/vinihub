import re
import unicodedata
import uuid

from fastapi import HTTPException
from sqlalchemy import func, select

from app.i18n import t
from app.modules.templates.envelope import instructions, plain
from app.modules.templates.models import CustomTemplate
from app.modules.templates.schema import MAX_CUSTOM, CustomTemplateIn, L10n, Template, TemplateField

PREFIX = "c_"


def custom_id(row_id: uuid.UUID) -> str:
    return PREFIX + row_id.hex


def _parse_id(template_id: str) -> uuid.UUID | None:
    if not template_id.startswith(PREFIX):
        return None
    try:
        return uuid.UUID(template_id[len(PREFIX):])
    except ValueError:
        return None


def _not_found(template_id: str) -> HTTPException:
    return HTTPException(404, t("template.not_found", template=template_id))


def _slug(label: str) -> str:
    folded = unicodedata.normalize("NFD", label.replace("đ", "d").replace("Đ", "D"))
    ascii_only = "".join(c for c in folded if not unicodedata.combining(c))
    base = re.sub(r"[^a-z0-9]+", "_", ascii_only.lower()).strip("_")[:30]
    if not base:
        return "field"
    return base if base[0].isalpha() else f"f_{base}"


def build_fields(body: CustomTemplateIn) -> list[dict]:
    reserved = {f.key for f in body.fields if f.key}
    used: set[str] = set()
    out = []
    for f in body.fields:
        key = f.key if f.key and f.key not in used else None
        if key is None:
            base = _slug(f.label)
            key, n = base, 2
            while key in used or key in reserved:
                key, n = f"{base}_{n}", n + 1
        used.add(key)
        out.append({"key": key, "type": f.type, "label": f.label, "hint": f.hint or f.label, "send": f.send})
    return out


def _to_template(row: CustomTemplate) -> Template:
    return Template(
        id=custom_id(row.id),
        name=L10n(vi=row.name, en=row.name),
        description=L10n(vi=row.description or row.name, en=row.description or row.name),
        fields=[
            TemplateField(key=f["key"], type=f["type"], label=L10n(vi=f["label"], en=f["label"]),
                          hint=f["hint"], send=f.get("send"))
            for f in row.fields
        ],
    )


def custom_out(row: CustomTemplate) -> dict:
    return {
        "id": custom_id(row.id), "user_id": str(row.user_id),
        "name": row.name, "description": row.description,
        "fields": [{"key": f["key"], "type": f["type"], "label": f["label"], "hint": f["hint"], "send": f.get("send")}
                   for f in row.fields],
    }


async def list_custom(db, ws_id: uuid.UUID) -> list[CustomTemplate]:
    q = select(CustomTemplate).where(CustomTemplate.workspace_id == ws_id).order_by(CustomTemplate.created_at)
    return list((await db.scalars(q)).all())


async def listing(db, ws_id: uuid.UUID) -> list[dict]:
    return [custom_out(r) for r in await list_custom(db, ws_id)]


async def get_custom(db, ws_id: uuid.UUID, template_id: str) -> CustomTemplate:
    row_id = _parse_id(template_id)
    row = await db.get(CustomTemplate, row_id) if row_id else None
    if not row or row.workspace_id != ws_id:
        raise _not_found(template_id)
    return row


async def resolve(db, ws_id: uuid.UUID, template_id: str) -> Template:
    return _to_template(await get_custom(db, ws_id, template_id))


async def _ensure_room(db, ws_id: uuid.UUID) -> None:
    total = await db.scalar(select(func.count()).select_from(CustomTemplate).where(CustomTemplate.workspace_id == ws_id))
    if total >= MAX_CUSTOM:
        raise HTTPException(400, t("template.limit", max=MAX_CUSTOM))


async def create_custom(db, ws_id: uuid.UUID, user_id: uuid.UUID, body: CustomTemplateIn) -> CustomTemplate:
    await _ensure_room(db, ws_id)
    row = CustomTemplate(workspace_id=ws_id, user_id=user_id, name=body.name, description=body.description,
                         fields=build_fields(body))
    db.add(row)
    await db.commit()
    return row


async def update_custom(db, row: CustomTemplate, body: CustomTemplateIn) -> CustomTemplate:
    row.name = body.name
    row.description = body.description
    row.fields = build_fields(body)
    await db.commit()
    return row


async def delete_custom(db, row: CustomTemplate) -> None:
    await db.delete(row)
    await db.commit()


__all__ = ["instructions", "plain"]
