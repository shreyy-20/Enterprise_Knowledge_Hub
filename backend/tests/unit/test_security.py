# backend/tests/unit/test_security.py
"""
Unit tests for security utilities, password hashing, JWT tokens, and input sanitization.
"""

from datetime import timedelta
import pytest
from fastapi import HTTPException
from jose import jwt

from app.core.config import settings
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
    sanitize_input,
)


def test_password_hashing():
    """Test bcrypt hashing and matching verification."""
    password = "SuperSecretPassword123!"
    hashed = get_password_hash(password)
    
    # Hash should be different from original password
    assert hashed != password
    # Hash should start with bcrypt indicator
    assert hashed.startswith("$2b$")
    
    # Verify works
    assert verify_password(password, hashed) is True
    # Verify fails for wrong password
    assert verify_password("wrongpassword", hashed) is False


def test_jwt_tokens_creation_and_validation():
    """Test generating access and refresh JWTs and verifying them."""
    payload = {"sub": "8a3d6b05-c99b-4654-a957-3f32de390c2e", "role": "admin"}
    
    access_token = create_access_token(data=payload)
    refresh_token = create_refresh_token(data=payload)
    
    assert isinstance(access_token, str)
    assert isinstance(refresh_token, str)
    
    # Verify claims
    decoded_access = verify_token(access_token)
    assert decoded_access["sub"] == payload["sub"]
    assert decoded_access["type"] == "access"
    
    decoded_refresh = verify_token(refresh_token)
    assert decoded_refresh["sub"] == payload["sub"]
    assert decoded_refresh["type"] == "refresh"


def test_jwt_token_expiration():
    """Test that expired tokens fail validation."""
    payload = {"sub": "user-uuid"}
    # Create token with short expiration
    expires_delta = timedelta(seconds=-5)
    expired_token = create_access_token(data=payload, expires_delta=expires_delta)
    
    with pytest.raises(HTTPException) as exc_info:
        verify_token(expired_token)
    
    assert exc_info.value.status_code == 401
    assert "Could not validate token" in exc_info.value.detail


def test_jwt_missing_subject():
    """Test token validation fails when subject claim is missing."""
    # Encode token manually without 'sub'
    claims = {"role": "user", "type": "access"}
    invalid_token = jwt.encode(claims, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    
    with pytest.raises(HTTPException) as exc_info:
        verify_token(invalid_token)
        
    assert exc_info.value.status_code == 401
    assert "Token missing subject claim" in exc_info.value.detail


def test_input_sanitization_sql_injection():
    """Test that input sanitization strips SQL injection keywords."""
    malicious_sql = "SELECT * FROM users WHERE email = 'admin@company.com' UNION DROP TABLE users;"
    sanitized = sanitize_input(malicious_sql)
    
    # SQL keywords should be removed
    assert "SELECT" not in sanitized
    assert "DROP" not in sanitized
    assert "UNION" not in sanitized
    assert "users" in sanitized


def test_input_sanitization_xss():
    """Test that input sanitization escapes HTML elements to neutralize XSS scripts."""
    malicious_xss = "<script>alert('hack');</script>"
    sanitized = sanitize_input(malicious_xss)
    
    # HTML tags should be escaped
    assert "<script>" not in sanitized
    assert "&lt;script&gt;" in sanitized
    assert "alert" in sanitized


def test_input_sanitization_whitespace():
    """Test that multiple whitespaces are collapsed and stripped."""
    dirty_text = "   This    is a   clean   sentence.   "
    sanitized = sanitize_input(dirty_text)
    
    assert sanitized == "This is a clean sentence."
