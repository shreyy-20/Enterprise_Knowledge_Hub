"""
Authentication API Router.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_redis, oauth2_scheme
from app.core.redis import RedisClient
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, RefreshRequest
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    register_data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user in the system."""
    user = await AuthService.register_user(db=db, register_data=register_data)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """Login using standard form username (email) and password."""
    login_data = LoginRequest(email=form_data.username, password=form_data.password)
    return await AuthService.login_user(db=db, login_data=login_data)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    refresh_data: RefreshRequest,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """Obtain a new access token using a valid refresh token."""
    return await AuthService.refresh_tokens(
        db=db,
        redis=redis,
        refresh_token=refresh_data.refresh_token,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    token: str = Depends(oauth2_scheme),
    refresh_data: Optional[RefreshRequest] = None,
    redis: RedisClient = Depends(get_redis),
):
    """Logout the current user by blacklisting their tokens in Redis."""
    refresh_token = refresh_data.refresh_token if refresh_data else None
    await AuthService.logout_user(
        redis=redis,
        access_token=token,
        refresh_token=refresh_token,
    )
