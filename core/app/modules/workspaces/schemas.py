from pydantic import BaseModel, Field

from app.modules.workspaces.models import Workspace


class WorkspaceIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)


def workspace_out(w: Workspace, role: str | None = None) -> dict:
    return {"id": str(w.id), "name": w.name, "role": role}
