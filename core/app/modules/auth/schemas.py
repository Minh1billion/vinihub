from app.modules.auth.models import User


def user_out(u: User) -> dict:
    return {"id": str(u.id), "email": u.email, "name": u.name, "avatar_url": u.avatar_url}
