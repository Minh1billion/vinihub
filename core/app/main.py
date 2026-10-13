from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware

from app.bootstrap import startup
from app.config import settings
from app.i18n import LanguageMiddleware
from app.packages.api import api


@asynccontextmanager
async def lifespan(_: FastAPI):
    await startup()
    yield


app = FastAPI(title="ViniHub Core", lifespan=lifespan)
app.add_middleware(LanguageMiddleware)
app.add_middleware(SessionMiddleware, secret_key=settings.secret_key, same_site="lax",
                   https_only=settings.app_url.startswith("https"))
app.include_router(api)


@app.get("/health")
async def health():
    return {"ok": True}
