from pydantic import BaseModel, ConfigDict, Field

from app.modules.auth.models import User
from app.modules.auth.profile import avatar_of, display_name


def user_out(u: User) -> dict:
    return {"id": str(u.id), "email": u.email, "name": display_name(u), "avatar_url": avatar_of(u), "handle": u.handle}


def profile_out(u: User) -> dict:
    return {
        **user_out(u),
        "bio": u.bio,
        "onboarded": u.onboarded_at is not None,
        "avatar_source": "upload" if u.avatar_key else "oauth",
        "oauth_avatar_url": u.avatar_url,
        "oauth_name": u.name,
    }


class ProfilePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    display_name: str | None = Field(default=None, max_length=60)
    handle: str | None = Field(default=None, max_length=31)
    bio: str | None = Field(default=None, max_length=280)
    complete_onboarding: bool = False
