from . import auth, workspaces, invites, assets, chat, generation, catalog, billing, gateway, mail, templates, market, jobs, profile, exports

AREAS = (auth, workspaces, invites, assets, chat, generation, catalog, billing, gateway, mail, templates, market, jobs, profile, exports,)

MESSAGES: dict[str, dict[str, str]] = {
    "vi": {k: v for a in AREAS for k, v in a.VI.items()},
    "en": {k: v for a in AREAS for k, v in a.EN.items()},
}
