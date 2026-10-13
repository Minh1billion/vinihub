from sqlalchemy.ext.asyncio import AsyncSession

from app.i18n import t
from app.modules.auth import service as auth_svc
from app.modules.auth.models import User
from app.modules.billing import service as billing_svc
from app.modules.workspaces import service as ws_svc


async def sign_in_with_google(db: AsyncSession, info: dict) -> User:
    user, created = await auth_svc.upsert_google_user(db, info)
    if created:
        await ws_svc.create_workspace(db, user.id, t("ws.default_name"))
        billing_svc.start_subscription(db, user.id)
    await db.commit()
    return user
