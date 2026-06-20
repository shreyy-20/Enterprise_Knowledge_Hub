# backend/tests/conftest.py
"""
Pytest configuration with async support, database fixtures, API test clients, and mocked external services.
"""

import asyncio
import json
import os
from unittest.mock import AsyncMock, MagicMock
import pytest
from httpx import AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.types import TypeDecorator, CHAR, TEXT
from sqlalchemy.dialects.postgresql import UUID, ARRAY

# ---------------------------------------------------------------------------
# SQLite Compatibility Layer for Postgres UUID and ARRAY Types
# ---------------------------------------------------------------------------

@compiles(UUID, "sqlite")
def compile_uuid_sqlite(element, compiler, **kw):
    return "CHAR(36)"

@compiles(ARRAY, "sqlite")
def compile_array_sqlite(element, compiler, **kw):
    return "TEXT"

# Intercept serialization/deserialization for ARRAY insert/select in SQLite
class SQLiteArrayCompat(TypeDecorator):
    impl = TEXT
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, list):
            return json.dumps(value)
        return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return []
        try:
            return json.loads(value)
        except Exception:
            return [value]

# ---------------------------------------------------------------------------
# Global Mocks for External Services (Redis, Qdrant, Kafka)
# ---------------------------------------------------------------------------

from app.core.redis import redis_client
from app.core.qdrant import qdrant_manager
from app.core.kafka import kafka_producer

# Mock Redis connection methods
redis_client.connect = AsyncMock()
redis_client.disconnect = AsyncMock()
redis_client._client = AsyncMock()

class MockRedis:
    def __init__(self):
        self.store = {}
        self.client = AsyncMock()
        self.client.ping = AsyncMock(return_value=True)

    async def get(self, key: str):
        return self.store.get(key)

    async def set(self, key: str, value: str, ttl: int = None):
        self.store[key] = str(value)
        return True

    async def delete(self, key: str):
        if key in self.store:
            del self.store[key]
            return 1
        return 0

    async def exists(self, key: str):
        return key in self.store

    async def incr(self, key: str):
        val = int(self.store.get(key, 0)) + 1
        self.store[key] = str(val)
        return val

    async def expire(self, key: str, seconds: int):
        return True

# Mock Qdrant manager
qdrant_manager.connect = AsyncMock()
qdrant_manager.disconnect = AsyncMock()
qdrant_manager.client = AsyncMock()
qdrant_manager.create_collection = AsyncMock(return_value=True)
qdrant_manager.upsert_vectors = AsyncMock()
qdrant_manager.search = AsyncMock(return_value=[])
qdrant_manager.delete_vectors = AsyncMock()

# Mock Kafka producer
kafka_producer.start = AsyncMock()
kafka_producer.stop = AsyncMock()
kafka_producer.send_message = AsyncMock()

# ---------------------------------------------------------------------------
# Import Main App Modules After Appling Mocks
# ---------------------------------------------------------------------------

from app.main import app
from app.core.database import Base, get_db
from app.core.redis import get_redis
from app.core.security import get_password_hash, create_access_token
from app.models.user import User, Role
from app.models.document import Document

# Determine Test Database URL
# Default to SQLite for fast local testing, fallback to PostgreSQL if specified
TEST_DB_FILE = "./test_temp.db"
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_FILE}"

# Setup test engine
engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in TEST_DATABASE_URL else {},
)
TestingSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# ---------------------------------------------------------------------------
# Pytest Lifespan & Loop Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def event_loop():
    """Create a session-scoped event loop to run async fixtures."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session", autouse=True)
async def setup_test_database():
    """Initializes tables in the test database on session startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield
    
    # Session teardown: clean up SQLite file
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()
    
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass

# ---------------------------------------------------------------------------
# Core Database & Client Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
async def test_db() -> AsyncSession:
    """Yields a clean database session wrapped in a transaction rollback."""
    async with TestingSessionLocal() as session:
        # Put everything inside a transaction
        await session.begin()
        yield session
        await session.rollback()
        await session.close()

@pytest.fixture
def mock_redis_instance():
    return MockRedis()

@pytest.fixture
async def client(test_db: AsyncSession, mock_redis_instance: MockRedis) -> AsyncClient:
    """FastAPI AsyncClient with database and Redis dependency overrides."""
    # Override database dependency
    app.dependency_overrides[get_db] = lambda: test_db
    # Override Redis dependency
    app.dependency_overrides[get_redis] = lambda: mock_redis_instance

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    # Clean overrides
    app.dependency_overrides.clear()

# ---------------------------------------------------------------------------
# Seed User Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
async def test_user(test_db: AsyncSession) -> User:
    """Creates a standard test user in the test database."""
    hashed_pwd = get_password_hash("password123")
    user = User(
        email="user@company.com",
        username="standarduser",
        hashed_password=hashed_pwd,
        full_name="Standard User",
        is_active=True,
        is_superuser=False,
    )
    
    # Ensure role exists and associate
    role = Role(name="User", description="Standard User")
    test_db.add(role)
    user.roles.append(role)
    
    test_db.add(user)
    await test_db.flush()
    return user

@pytest.fixture
async def test_admin(test_db: AsyncSession) -> User:
    """Creates an admin test user in the test database."""
    hashed_pwd = get_password_hash("adminpass123")
    admin = User(
        email="admin@company.com",
        username="adminuser",
        hashed_password=hashed_pwd,
        full_name="Admin User",
        is_active=True,
        is_superuser=True,
    )
    
    role = Role(name="Admin", description="Administrator Role")
    test_db.add(role)
    admin.roles.append(role)
    
    test_db.add(admin)
    await test_db.flush()
    return admin

# ---------------------------------------------------------------------------
# Authentication Headers Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def auth_headers(test_user: User) -> dict:
    """Returns authorization headers for the standard user."""
    access_token = create_access_token(data={"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {access_token}"}

@pytest.fixture
def admin_headers(test_admin: User) -> dict:
    """Returns authorization headers for the admin user."""
    access_token = create_access_token(data={"sub": str(test_admin.id)})
    return {"Authorization": f"Bearer {access_token}"}
