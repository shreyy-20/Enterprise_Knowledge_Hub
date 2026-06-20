"""
Redis client wrapper with connection pooling and convenience methods.
"""

from typing import Any, Optional

import redis.asyncio as aioredis

from app.core.config import settings


class RedisClient:
    """Async Redis client with connection pooling."""

    def __init__(self, url: str = settings.REDIS_URL) -> None:
        self._url = url
        self._pool: Optional[aioredis.ConnectionPool] = None
        self._client: Optional[aioredis.Redis] = None

    async def connect(self) -> None:
        """Establish the Redis connection pool."""
        self._pool = aioredis.ConnectionPool.from_url(
            self._url,
            max_connections=20,
            decode_responses=True,
        )
        self._client = aioredis.Redis(connection_pool=self._pool)

    async def disconnect(self) -> None:
        """Close the Redis connection pool."""
        if self._client:
            await self._client.close()
        if self._pool:
            await self._pool.disconnect()

    @property
    def client(self) -> aioredis.Redis:
        if self._client is None:
            raise RuntimeError("Redis client is not connected. Call connect() first.")
        return self._client

    async def get(self, key: str) -> Optional[str]:
        """Get a value by key."""
        return await self.client.get(key)

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
    ) -> bool:
        """Set a key-value pair with optional TTL in seconds."""
        if ttl is not None:
            result = await self.client.setex(key, ttl, value)
        else:
            result = await self.client.set(key, value)
        return bool(result)

    async def delete(self, key: str) -> int:
        """Delete a key. Returns the number of keys removed."""
        return await self.client.delete(key)

    async def exists(self, key: str) -> bool:
        """Check if a key exists."""
        return bool(await self.client.exists(key))

    async def incr(self, key: str) -> int:
        """Increment an integer key by 1."""
        return await self.client.incr(key)

    async def expire(self, key: str, seconds: int) -> bool:
        """Set a TTL on an existing key."""
        return bool(await self.client.expire(key, seconds))


# Module-level singleton
redis_client = RedisClient()


async def get_redis() -> RedisClient:
    """FastAPI dependency that returns the Redis client singleton."""
    return redis_client
