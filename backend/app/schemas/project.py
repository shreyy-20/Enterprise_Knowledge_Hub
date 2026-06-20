"""
Project Pydantic schemas.
"""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from app.models.project import ProjectStatus


class ProjectCreate(BaseModel):
    """Project creation payload."""
    name: str = Field(..., max_length=255)
    description: str | None = None
    department_id: UUID | None = None


class ProjectUpdate(BaseModel):
    """Project update payload."""
    name: str | None = Field(None, max_length=255)
    description: str | None = None
    status: ProjectStatus | None = None


class ProjectResponse(BaseModel):
    """Project response schema."""
    id: UUID
    name: str
    description: str | None = None
    status: ProjectStatus
    department_id: UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class ProjectListResponse(BaseModel):
    """List of projects."""
    items: list[ProjectResponse]
    total: int


class ProjectMemberAdd(BaseModel):
    """Add member to project payload."""
    user_id: UUID
    role: str = Field("member", max_length=50)
