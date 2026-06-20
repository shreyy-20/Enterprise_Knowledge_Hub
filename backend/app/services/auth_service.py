"""
Authentication and session management service.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from uuid import UUID
from fastapi import HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.redis import RedisClient
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
)
from app.models.user import User, Role
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, PasswordChangeRequest


class AuthService:
    """Service to handle authentication workflows."""

    @staticmethod
    async def register_user(db: AsyncSession, register_data: RegisterRequest) -> User:
        """Register a new user and assign the default User role if it exists."""
        # Check if email already registered
        query = select(User).where(User.email == register_data.email)
        result = await db.execute(query)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Check if username already registered
        query = select(User).where(User.username == register_data.username)
        result = await db.execute(query)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered",
            )

        # Create new user
        hashed_password = get_password_hash(register_data.password)
        new_user = User(
            email=register_data.email,
            username=register_data.username,
            hashed_password=hashed_password,
            full_name=register_data.full_name,
            is_active=True,
            is_superuser=False,
        )

        # Fetch and attach default "User" role if it exists
        role_query = select(Role).where(Role.name == "User")
        role_result = await db.execute(role_query)
        default_role = role_result.scalar_one_or_none()
        if default_role:
            new_user.roles.append(default_role)

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        return new_user

    @staticmethod
    async def login_user(
        db: AsyncSession, login_data: LoginRequest
    ) -> TokenResponse:
        """Authenticate user, verify password, and return token pair."""
        query = select(User).where(User.email == login_data.email)
        result = await db.execute(query)
        user = result.scalar_one_or_none()

        if not user or not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account is deactivated",
            )

        # Create tokens
        access_payload = {"sub": str(user.id)}
        refresh_payload = {"sub": str(user.id)}

        access_token = create_access_token(data=access_payload)
        refresh_token = create_refresh_token(data=refresh_payload)

        # Expiry time in seconds (30 mins for access token)
        expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=expires_in,
        )

    @staticmethod
    async def refresh_tokens(
        db: AsyncSession, redis: RedisClient, refresh_token: str
    ) -> TokenResponse:
        """Validate refresh token, check blacklist, and issue new tokens."""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate refresh token",
        )

        # Check blacklist
        is_blacklisted = await redis.exists(f"blacklist:{refresh_token}")
        if is_blacklisted:
            raise credentials_exception

        try:
            payload = jwt.decode(
                refresh_token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
            )
            user_id_str: str = payload.get("sub")
            token_type: str = payload.get("type", "")
            if user_id_str is None or token_type != "refresh":
                raise credentials_exception
            user_id = UUID(user_id_str)
        except (JWTError, ValueError):
            raise credentials_exception

        # Check user exists
        query = select(User).where(User.id == user_id)
        result = await db.execute(query)
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            raise credentials_exception

        # Blacklist the old refresh token (optional but secure)
        try:
            exp = payload.get("exp")
            if exp:
                now = datetime.now(timezone.utc).timestamp()
                ttl = int(exp - now)
                if ttl > 0:
                    await redis.set(f"blacklist:{refresh_token}", "true", ttl=ttl)
        except Exception:
            pass

        # Issue new token pair
        access_token = create_access_token(data={"sub": str(user.id)})
        new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
        expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=expires_in,
        )

    @staticmethod
    async def logout_user(redis: RedisClient, access_token: str, refresh_token: Optional[str] = None) -> None:
        """Blacklist active access and refresh tokens in Redis."""
        # Blacklist Access Token
        try:
            payload = jwt.decode(
                access_token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
            )
            exp = payload.get("exp")
            if exp:
                now = datetime.now(timezone.utc).timestamp()
                ttl = int(exp - now)
                if ttl > 0:
                    await redis.set(f"blacklist:{access_token}", "true", ttl=ttl)
        except Exception:
            # If token cannot be decoded (already expired or malformed), ignore or set short TTL
            await redis.set(f"blacklist:{access_token}", "true", ttl=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

        # Blacklist Refresh Token if provided
        if refresh_token:
            try:
                payload = jwt.decode(
                    refresh_token,
                    settings.JWT_SECRET_KEY,
                    algorithms=[settings.JWT_ALGORITHM],
                )
                exp = payload.get("exp")
                if exp:
                    now = datetime.now(timezone.utc).timestamp()
                    ttl = int(exp - now)
                    if ttl > 0:
                        await redis.set(f"blacklist:{refresh_token}", "true", ttl=ttl)
            except Exception:
                await redis.set(f"blacklist:{refresh_token}", "true", ttl=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600)

    @staticmethod
    async def change_password(
        db: AsyncSession, user: User, change_data: PasswordChangeRequest
    ) -> None:
        """Change user password after verifying current password."""
        if not verify_password(change_data.current_password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Incorrect current password",
            )

        user.hashed_password = get_password_hash(change_data.new_password)
        db.add(user)
        await db.commit()
