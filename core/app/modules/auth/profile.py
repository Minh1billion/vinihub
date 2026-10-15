def display_name(u) -> str:
    return u.display_name or u.name or ""


def avatar_of(u) -> str | None:
    return f"/api/users/{u.id}/avatar?v={u.avatar_ver}" if u.avatar_key else u.avatar_url
