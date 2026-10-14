from fastapi import APIRouter

from app.packages.api import (assets, auth, billing, catalog, chat, generation, invites, jobs, market, providers,
                              templates, workspaces)

api = APIRouter(prefix="/api")
for router in (auth.router, workspaces.router, invites.router, invites.token_router, assets.router,
               catalog.router, templates.router, chat.router, generation.router, billing.router, providers.router, market.router, jobs.router):
    api.include_router(router)
