# backend/tests/api/test_auth.py
"""
Integration tests for Authentication API endpoints (/register, /login, /refresh, /logout).
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.user import User


@pytest.mark.asyncio
async def test_register_user_success(client: AsyncClient, test_db: AsyncSession):
    """Test successful user registration flow."""
    payload = {
        "email": "newuser@company.com",
        "username": "newusername",
        "password": "strongpassword123!",
        "full_name": "New User"
    }
    
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    
    data = response.json()
    assert data["email"] == payload["email"]
    assert data["username"] == payload["username"]
    assert data["full_name"] == payload["full_name"]
    assert "id" in data
    
    # Verify saved in test database
    stmt = select(User).where(User.email == payload["email"])
    res = await test_db.execute(stmt)
    user = res.scalar_one_or_none()
    assert user is not None
    assert user.full_name == "New User"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, test_user: User):
    """Test registration fails with duplicate email address."""
    payload = {
        "email": test_user.email,  # Already exists
        "username": "distinctusername",
        "password": "password123!",
        "full_name": "Duplicate User"
    }
    
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_user_success(client: AsyncClient, test_user: User):
    """Test login with valid credentials."""
    login_data = {
        "username": test_user.email,  # OAuth2 password form sends email in username
        "password": "password123"
    }
    
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient, test_user: User):
    """Test login fails with incorrect password."""
    login_data = {
        "username": test_user.email,
        "password": "wrongpassword"
    }
    
    response = await client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 400
    assert "Incorrect email or password" in response.json()["detail"]


@pytest.mark.asyncio
async def test_refresh_token_success(client: AsyncClient, test_user: User):
    """Test token refresh using valid refresh token."""
    # First login to obtain tokens
    login_data = {
        "username": test_user.email,
        "password": "password123"
    }
    login_res = await client.post("/api/v1/auth/login", data=login_data)
    refresh_token = login_res.json()["refresh_token"]
    
    # Request refresh
    refresh_payload = {"refresh_token": refresh_token}
    response = await client.post("/api/v1/auth/refresh", json=refresh_payload)
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_logout_and_blacklisting(client: AsyncClient, test_user: User):
    """Test user logout adds tokens to the Redis blacklist."""
    # 1. Login to get tokens
    login_data = {
        "username": test_user.email,
        "password": "password123"
    }
    login_res = await client.post("/api/v1/auth/login", data=login_data)
    access_token = login_res.json()["access_token"]
    refresh_token = login_res.json()["refresh_token"]
    
    # 2. Call logout with Auth header
    headers = {"Authorization": f"Bearer {access_token}"}
    logout_payload = {"refresh_token": refresh_token}
    response = await client.post("/api/v1/auth/logout", json=logout_payload, headers=headers)
    assert response.status_code == 204
    
    # 3. Call private endpoint with blacklisted token -> should be rejected
    # (Since we mocked get_redis dependency, get_current_user checks blacklist and rejects)
    me_response = await client.get("/api/v1/users/me", headers=headers)
    assert me_response.status_code == 401
    assert "Could not validate credentials" in me_response.json()["detail"]
