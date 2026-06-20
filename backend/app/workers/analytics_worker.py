"""
Analytics Worker.
Kafka consumer that persists application usage events (search, view, etc.) to the database.
"""

import asyncio
import logging
from uuid import UUID

from app.core.database import AsyncSessionLocal
from app.core.kafka import KafkaConsumer, Topics
from app.services.analytics_service import AnalyticsService

# Configure logger
logger = logging.getLogger("analytics_worker")
logging.basicConfig(level=logging.INFO)


async def process_analytics_event(value: dict) -> None:
    """Read event details and save the analytics record to the database."""
    user_id_str = value.get("user_id")
    event_type = value.get("event_type")
    meta = value.get("metadata", {})

    if not event_type:
        logger.warning("Analytics event missing event_type. Skipping.")
        return

    user_id = None
    if user_id_str:
        try:
            user_id = UUID(user_id_str)
        except ValueError:
            logger.error(f"Invalid user UUID format in analytics: {user_id_str}")
            return

    async with AsyncSessionLocal() as db:
        try:
            logger.info(f"Logging analytics event '{event_type}' for user: {user_id}")
            await AnalyticsService.log_event(
                db=db,
                user_id=user_id,
                event_type=event_type,
                metadata=meta,
            )
        except Exception as exc:
            logger.error(f"Database error writing analytics event: {exc}", exc_info=True)


async def main() -> None:
    """Worker loop subscribing to ANALYTICS_EVENTS topic."""
    consumer = KafkaConsumer(
        topics=[Topics.ANALYTICS_EVENTS],
        group_id="analytics-worker-group",
    )
    await consumer.start()
    logger.info("Analytics Worker started. Listening on topic: analytics.events")

    try:
        async for message in consumer.consume_messages():
            val = message.get("value", {})
            logger.info(f"Received analytics event: {val}")
            await process_analytics_event(val)
    except asyncio.CancelledError:
        logger.info("Analytics Worker shutdown requested.")
    finally:
        await consumer.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Exiting on KeyboardInterrupt")
