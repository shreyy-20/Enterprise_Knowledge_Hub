"""
Security utilities: password hashing, JWT tokens, RBAC, and input sanitization.
"""

import html
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """Hash a plain-text password with bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


# ---------------------------------------------------------------------------
# JWT token creation & verification
# ---------------------------------------------------------------------------
bearer_scheme = HTTPBearer(auto_error=False)


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token.

    Args:
        data: Payload claims (must include 'sub' for subject).
        expires_delta: Custom expiration duration; defaults to settings value.

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT refresh token.

    Args:
        data: Payload claims (must include 'sub' for subject).
        expires_delta: Custom expiration duration; defaults to settings value.

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_token(token: str) -> Dict[str, Any]:
    """Decode and verify a JWT token.

    Raises:
        HTTPException 401 if the token is invalid or expired.

    Returns:
        The decoded payload dictionary.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("sub") is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token missing subject claim",
            )
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate token: {exc}",
        ) from exc


async def get_current_user_payload(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Dict[str, Any]:
    """FastAPI dependency that extracts and validates the Bearer JWT."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_token(credentials.credentials)


# ---------------------------------------------------------------------------
# Role-Based Access Control (RBAC)
# ---------------------------------------------------------------------------
class RBACChecker:
    """Dependency that checks if the current user has the required permissions.

    Usage::

        from fastapi import Depends
        rbac = RBACChecker(required_permissions=["documents:read"])

        @router.get("/documents", dependencies=[Depends(rbac)])
        async def list_documents(): ...
    """

    def __init__(self, required_permissions: List[str]) -> None:
        self.required_permissions = required_permissions

    async def __call__(
        self,
        request: Request,
        payload: Dict[str, Any] = Depends(get_current_user_payload),
    ) -> Dict[str, Any]:
        user_permissions: List[str] = payload.get("permissions", [])
        is_superuser: bool = payload.get("is_superuser", False)

        if is_superuser:
            return payload

        missing = set(self.required_permissions) - set(user_permissions)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permissions: {', '.join(sorted(missing))}",
            )
        return payload


# ---------------------------------------------------------------------------
# Input sanitization
# ---------------------------------------------------------------------------
_SQL_INJECTION_PATTERN = re.compile(
    r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION|TRUNCATE|"
    r"DECLARE|CAST|CONVERT|WAITFOR|XP_)\b)",
    re.IGNORECASE,
)


def sanitize_input(text: str) -> str:
    """Sanitize user input against SQL injection keywords and XSS.

    Escapes HTML entities and removes suspicious SQL keywords.
    """
    # HTML-escape to neutralize XSS payloads
    sanitized = html.escape(text, quote=True)
    # Strip SQL injection patterns
    sanitized = _SQL_INJECTION_PATTERN.sub("", sanitized)
    # Collapse multiple whitespace
    sanitized = re.sub(r"\s+", " ", sanitized).strip()
    return sanitized
