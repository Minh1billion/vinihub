import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User


async def get_user(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    return await db.get(User, user_id)


async def users_by_ids(db: AsyncSession, ids: list[uuid.UUID]) -> list[User]:
    if not ids:
        return []
    return list((await db.scalars(select(User).where(User.id.in_(ids)))).all())


async def find_by_email(db: AsyncSession, email: str) -> User | None:
    return await db.scalar(select(User).where(func.lower(User.email) == email.strip().lower()))


async def upsert_google_user(db: AsyncSession, info: dict) -> tuple[User, bool]:
    user = await db.scalar(select(User).where(User.google_sub == info["sub"]))
    if user:
        user.name, user.avatar_url = info.get("name", user.name), info.get("picture", user.avatar_url)
        return user, False
    user = User(email=info["email"], name=info.get("name", ""), avatar_url=info.get("picture"),
                google_sub=info["sub"])
    db.add(user)
    await db.flush()
    return user, True
