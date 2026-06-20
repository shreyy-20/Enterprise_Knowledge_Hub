"""
User Pydantic schemas.
"""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserCreate(BaseModel):
    """User registration / creation payload."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str | None = Field(None, max_length=255)
    department_id: UUID | None = None


class UserUpdate(BaseModel):
    """User update payload."""
    email: EmailStr | None = None
    username: str | None = Field(None, min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    full_name: str | None = Field(None, max_length=255)
    avatar_url: str | None = Field(None, max_length=512)
    department_id: UUID | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    """User response schema."""
    id: UUID
    email: EmailStr
    username: str
    full_name: str | None
    avatar_url: str | None
    department_id: UUID | None
    is_active: bool
    is_superuser: bool
    roles: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )

    @classmethod
    def model_validate(cls, obj: any, **kwargs):
        # Handle conversion from SQLAlchemy model roles relationship
        if hasattr(obj, "roles"):
            roles = [r.name for r in obj.roles] if isinstance(obj.roles, list) else []
            # We can extract fields and override roles
            data = {
                "id": obj.id,
                "email": obj.email,
                "username": obj.username,
                "full_name": obj.full_name,
                "avatar_url": obj.avatar_url,
                "department_id": obj.department_id,
                "is_active": obj.is_active,
                "is_superuser": obj.is_superuser,
                "roles": roles,
                "created_at": obj.created_at,
                "updated_at": obj.updated_at,
            }
            return cls(**data)
        return super().model_validate(obj, **kwargs)


class UserListResponse(BaseModel):
    """Paginated list of users."""
    items: list[UserResponse]
    total: int
    page: int
    size: int
