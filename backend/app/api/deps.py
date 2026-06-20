"""
FastAPI dependencies for authentication, authorization, and databases.
"""

from typing import Callable, List
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.database import get_db
from app.core.redis import get_redis, RedisClient
from app.models.user import User, Role, Permission

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
) -> User:
    """Decode JWT, check blacklist in Redis, and fetch user from DB."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Check Redis blacklist
    try:
        is_blacklisted = await redis.exists(f"blacklist:{token}")
        if is_blacklisted:
            raise credentials_exception
    except Exception:
        # Fallback if Redis is down/unavailable
        pass

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        user_id_str: str = payload.get("sub")
        token_type: str = payload.get("type", "access")
        if user_id_str is None or token_type != "access":
            raise credentials_exception
        user_id = UUID(user_id_str)
    except (JWTError, ValueError):
        raise credentials_exception

    # Retrieve user from DB with roles and permissions pre-fetched
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure current authenticated user is active."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user",
        )
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Ensure user is a superuser or has the Admin role."""
    if current_user.is_superuser:
        return current_user

    # Check if user has an "Admin" role
    is_admin = any(role.name.lower() == "admin" for role in current_user.roles)
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have enough privileges",
        )
    return current_user


def check_permissions(*required_permissions: str) -> Callable:
    """Enforce specific action/resource permissions from the database.

    Example: Depends(check_permissions("document:create", "document:delete"))
    """
    async def permission_dependency(
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        if current_user.is_superuser:
            return current_user

        # User has roles. Each role has permissions.
        # Let's collect all permission names.
        user_perms = set()
        for role in current_user.roles:
            for perm in role.permissions:
                user_perms.add(perm.name)

        missing = set(required_permissions) - user_perms
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permissions: {', '.join(sorted(missing))}",
            )
        return current_user

    return permission_dependency
