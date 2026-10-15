from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.i18n import t
from app.modules.auth.models import User
from app.modules.auth.schemas import profile_out
from app.modules.auth.security import COOKIE, SESSION_DAYS, make_token
from app.packages.api.deps import current_user
from app.packages.usecases import auth as uc
from app.shared.db import get_db

router = APIRouter(prefix="/auth", tags=["auth"])

oauth = OAuth()
oauth.register(
    "google",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    client_kwargs={"scope": "openid email profile"},
)
REDIRECT_URI = f"{settings.app_url}/api/auth/google/callback"


def safe_next(path: str) -> str:
    ok = path.startswith("/") and not path.startswith("//") and "\\" not in path
    return path if ok else "/"


@router.get("/google/login")
async def google_login(request: Request, next: str = "/"):
    if not settings.google_client_id:
        raise HTTPException(500, t("auth.google_not_configured"))
    request.session["next"] = safe_next(next)
    return await oauth.google.authorize_redirect(request, REDIRECT_URI)


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    info = token["userinfo"]
    if info.get("email_verified") is False:
        raise HTTPException(403, t("auth.email_unverified"))
    user = await uc.sign_in_with_google(db, info)

    nxt = safe_next(request.session.pop("next", "/"))
    resp = RedirectResponse(settings.app_url.rstrip("/") + nxt)
    resp.set_cookie(COOKIE, make_token(user.id), httponly=True, samesite="lax",
                    secure=settings.app_url.startswith("https"), max_age=SESSION_DAYS * 86400)
    return resp


@router.get("/me")
async def me(user: User = Depends(current_user)):
    return profile_out(user)


@router.post("/logout", status_code=204)
async def logout():
    resp = Response(status_code=204)
    resp.delete_cookie(COOKIE)
    return resp
