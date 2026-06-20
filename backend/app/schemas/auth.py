"""
Authentication Pydantic schemas.
"""

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """Login request body."""
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class TokenResponse(BaseModel):
    """JWT token pair response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    """Token refresh request body."""
    refresh_token: str


class RegisterRequest(BaseModel):
    """User registration request body."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str | None = Field(None, max_length=255)


class PasswordChangeRequest(BaseModel):
    """Password change request body."""
    current_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=8, max_length=128)
