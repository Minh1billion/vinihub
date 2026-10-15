import uuid

from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.auth.models import User
from app.modules.auth.schemas import ProfilePatch, profile_out
from app.packages.api.deps import current_user
from app.packages.usecases import profile as uc
from app.shared.db import get_db

router = APIRouter(tags=["profile"])


@router.get("/me/profile")
async def get_profile(user: User = Depends(current_user)):
    return profile_out(user)


@router.patch("/me/profile")
async def patch_profile(body: ProfilePatch, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await uc.update_profile(db, user, body)


@router.get("/me/profile/random-name")
async def random_name(_: User = Depends(current_user)):
    return uc.random_display_name()


@router.post("/me/profile/avatar")
async def upload_avatar(file: UploadFile, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await uc.set_avatar(db, user, file)


@router.delete("/me/profile/avatar")
async def delete_avatar(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await uc.clear_avatar(db, user)


@router.get("/users/{user_id}/avatar")
async def user_avatar(user_id: uuid.UUID, _: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return await uc.read_avatar(db, user_id)
