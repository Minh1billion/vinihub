import uuid

from fastapi import HTTPException
from sqlalchemy import String, cast, or_, select, update

from app.i18n import t
from app.modules.auth.models import User
from app.modules.market.codes import new_code
from app.modules.market.models import MarketInstall, MarketItem
from app.modules.market.schema import MAX_PER_USER, InstallIn, MarketItemIn, MarketItemPatch
from app.modules.templates import service as template_svc
from app.modules.templates.schema import CustomFieldIn, CustomTemplateIn


def out(item: MarketItem, author: User, user_id: uuid.UUID, installed: bool = False) -> dict:
    fields = item.payload["fields"]
    return {
        "id": str(item.id), "code": item.code, "kind": item.kind, "title": item.title, "description": item.description,
        "tags": item.tags, "installs": item.installs, "mine": item.author_id == user_id, "installed": installed,
        "created_at": item.created_at.isoformat(), "field_count": len(fields),
        "fields": [{"key": f["key"], "type": f["type"], "label": f["label"], "hint": f["hint"], "send": f.get("send")}
                   for f in fields],
        "author": {"id": str(author.id), "name": author.name or t("market.anonymous"), "avatar_url": author.avatar_url},
    }


def _like(text: str) -> str:
    escaped = text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


async def _installed_ids(db, ws_id: uuid.UUID | None) -> set[uuid.UUID]:
    if ws_id is None:
        return set()
    return set((await db.scalars(select(MarketInstall.item_id).where(MarketInstall.workspace_id == ws_id))).all())


async def listing(db, user_id: uuid.UUID, kind: str, q: str, sort: str, mine: bool, limit: int,
                  ws_id: uuid.UUID | None) -> list[dict]:
    stmt = select(MarketItem, User).join(User, User.id == MarketItem.author_id).where(MarketItem.kind == kind)
    if mine:
        stmt = stmt.where(MarketItem.author_id == user_id)
    if q.strip():
        pattern = _like(q.strip())
        stmt = stmt.where(or_(
            MarketItem.code.ilike(pattern, escape="\\"),
            MarketItem.title.ilike(pattern, escape="\\"),
            MarketItem.description.ilike(pattern, escape="\\"),
            cast(MarketItem.tags, String).ilike(pattern, escape="\\"),
        ))
    order = (MarketItem.installs.desc(), MarketItem.created_at.desc()) if sort == "popular" else (MarketItem.created_at.desc(),)
    rows = (await db.execute(stmt.order_by(*order).limit(limit))).all()
    installed = await _installed_ids(db, ws_id)
    return [out(item, author, user_id, item.id in installed) for item, author in rows]


async def get_item(db, item_id: uuid.UUID) -> MarketItem:
    item = await db.get(MarketItem, item_id)
    if not item:
        raise HTTPException(404, t("market.not_found"))
    return item


async def _owned(db, item_id: uuid.UUID, user_id: uuid.UUID) -> MarketItem:
    item = await get_item(db, item_id)
    if item.author_id != user_id:
        raise HTTPException(403, t("market.forbidden"))
    return item


async def _free_code(db, kind: str) -> str:
    for _ in range(8):
        code = new_code(kind)
        if await db.scalar(select(MarketItem.id).where(MarketItem.code == code)) is None:
            return code
    raise HTTPException(503, t("market.code_failed"))


async def create(db, user: User, body: MarketItemIn) -> dict:
    owned = await db.scalars(select(MarketItem.id).where(MarketItem.author_id == user.id))
    if len(owned.all()) >= MAX_PER_USER:
        raise HTTPException(400, t("market.limit", max=MAX_PER_USER))
    fields = template_svc.build_fields(CustomTemplateIn(name=body.title, description=body.description, fields=body.payload.fields))
    item = MarketItem(code=await _free_code(db, body.kind), kind=body.kind, author_id=user.id, title=body.title,
                      description=body.description, tags=body.tags, payload={"fields": fields})
    db.add(item)
    await db.commit()
    return out(item, user, user.id)


async def edit(db, user: User, item_id: uuid.UUID, body: MarketItemPatch) -> dict:
    item = await _owned(db, item_id, user.id)
    item.title, item.description, item.tags = body.title, body.description, body.tags
    await db.commit()
    return out(item, user, user.id)


async def remove(db, user: User, item_id: uuid.UUID) -> None:
    await db.delete(await _owned(db, item_id, user.id))
    await db.commit()


async def install(db, user: User, item_id: uuid.UUID, body: InstallIn) -> dict:
    item = await get_item(db, item_id)
    if item.id in await _installed_ids(db, body.workspace_id):
        raise HTTPException(409, t("market.installed", code=item.code))
    template = CustomTemplateIn(name=item.title, description=item.description,
                                fields=[CustomFieldIn(**f) for f in item.payload["fields"]])
    row = await template_svc.create_custom(db, body.workspace_id, user.id, template)
    db.add(MarketInstall(workspace_id=body.workspace_id, item_id=item.id, user_id=user.id))
    await db.execute(update(MarketItem).where(MarketItem.id == item.id).values(installs=MarketItem.installs + 1))
    await db.commit()
    return template_svc.custom_out(row)
