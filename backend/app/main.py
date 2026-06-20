"""
Main FastAPI application entrypoint.
Configures app lifespan, middleware, routers, and health checks.
"""

from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.database import init_db, close_db, get_db
from app.core.redis import redis_client, get_redis, RedisClient
from app.core.qdrant import qdrant_manager
from app.core.kafka import kafka_producer

# API Router Imports
from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.documents import router as documents_router
from app.api.v1.search import router as search_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.admin import router as admin_router
from app.api.v1.projects import router as projects_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.experts import router as experts_router

logger = logging.getLogger("main")
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """App Lifespan context manager for startup and shutdown procedures."""
    logger.info("Starting up backend application dependencies...")
    try:
        # Initialize PostgreSQL Tables
        await init_db()
        logger.info("PostgreSQL Database initialized.")
    except Exception as exc:
        logger.error(f"Failed to initialize database: {exc}")

    try:
        # Connect Redis
        await redis_client.connect()
        logger.info("Redis connection established.")
    except Exception as exc:
        logger.error(f"Failed to connect to Redis: {exc}")

    try:
        # Connect Qdrant
        await qdrant_manager.connect()
        logger.info("Qdrant connection established.")
    except Exception as exc:
        logger.error(f"Failed to connect to Qdrant: {exc}")

    try:
        # Connect Kafka Producer
        await kafka_producer.start()
        logger.info("Kafka Producer started.")
    except Exception as exc:
        logger.error(f"Failed to connect to Kafka: {exc}")

    yield

    logger.info("Shutting down backend application dependencies...")
    try:
        await kafka_producer.stop()
        logger.info("Kafka Producer stopped.")
    except Exception:
        pass

    try:
        await qdrant_manager.disconnect()
        logger.info("Qdrant disconnected.")
    except Exception:
        pass

    try:
        await redis_client.disconnect()
        logger.info("Redis connection pool closed.")
    except Exception:
        pass

    try:
        await close_db()
        logger.info("PostgreSQL Engine disposed.")
    except Exception:
        pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API v1 Router Registration
v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
v1_router.include_router(users_router, prefix="/users", tags=["Users"])
v1_router.include_router(documents_router, prefix="/documents", tags=["Documents"])
v1_router.include_router(search_router, prefix="/search", tags=["Search"])
v1_router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
v1_router.include_router(admin_router, prefix="/admin", tags=["Administration"])
v1_router.include_router(projects_router, prefix="/projects", tags=["Projects"])
v1_router.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])
v1_router.include_router(experts_router, prefix="/experts", tags=["Experts"])

app.include_router(v1_router)


# ---------------------------------------------------------------------------
# Health Status Endpoint
# ---------------------------------------------------------------------------

@app.get("/health", tags=["System Health"])
async def health_check(
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
):
    """Verify application health and component connectivity status."""
    db_status = "healthy"
    redis_status = "healthy"
    qdrant_status = "healthy"

    # 1. DB check
    try:
        await db.execute(select(1))
    except Exception as exc:
        db_status = f"unhealthy: {str(exc)}"

    # 2. Redis check
    try:
        await redis.client.ping()
    except Exception as exc:
        redis_status = f"unhealthy: {str(exc)}"

    # 3. Qdrant check
    try:
        if qdrant_manager.client:
            # Simple check by getting collection info
            await qdrant_manager.client.get_collection(settings.QDRANT_COLLECTION)
        else:
            qdrant_status = "unhealthy: client not initialized"
    except Exception as exc:
        # If collection doesn't exist yet but client works, it is healthy
        # Otherwise if connection fails it raises error
        if "not found" in str(exc).lower():
            qdrant_status = "healthy (collection pending)"
        else:
            qdrant_status = f"unhealthy: {str(exc)}"

    overall_status = "healthy"
    if "unhealthy" in db_status or "unhealthy" in redis_status or "unhealthy" in qdrant_status:
        overall_status = "degraded"

    return {
        "status": overall_status,
        "environment": settings.ENVIRONMENT,
        "version": settings.VERSION,
        "components": {
            "postgres": db_status,
            "redis": redis_status,
            "qdrant": qdrant_status,
        }
    }
