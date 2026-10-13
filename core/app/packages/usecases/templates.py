from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.templates import presets
from app.modules.templates import service as template_svc
from app.modules.templates.schema import CustomTemplateIn
from app.modules.workspaces import service as ws_svc
from app.modules.workspaces.models import Workspace


async def list_templates(db: AsyncSession, ws: Workspace) -> list[dict]:
    return await template_svc.listing(db, ws.id)


async def list_presets(db: AsyncSession, ws: Workspace) -> list[dict]:
    return await presets.listing(db, ws.id)


async def add_preset(db: AsyncSession, ws: Workspace, user: User, slug: str) -> dict:
    return template_svc.custom_out(await presets.add(db, ws.id, user.id, slug))


async def create_template(db: AsyncSession, ws: Workspace, user: User, body: CustomTemplateIn) -> dict:
    return template_svc.custom_out(await template_svc.create_custom(db, ws.id, user.id, body))


async def _editable(db: AsyncSession, ws: Workspace, user: User, template_id: str):
    row = await template_svc.get_custom(db, ws.id, template_id)
    await ws_svc.require_author_or_owner(db, ws.id, user.id, row.user_id, "template.edit_forbidden")
    return row


async def update_template(db: AsyncSession, ws: Workspace, user: User, template_id: str,
                          body: CustomTemplateIn) -> dict:
    row = await _editable(db, ws, user, template_id)
    return template_svc.custom_out(await template_svc.update_custom(db, row, body))


async def delete_template(db: AsyncSession, ws: Workspace, user: User, template_id: str) -> None:
    await template_svc.delete_custom(db, await _editable(db, ws, user, template_id))
