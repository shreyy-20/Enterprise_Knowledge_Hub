"""
Notification Worker.
Kafka consumer that creates user notifications in the database asynchronously.
"""

import asyncio
import logging
from uuid import UUID

from app.core.database import AsyncSessionLocal
from app.core.kafka import KafkaConsumer, Topics
from app.services.notification_service import NotificationService

# Configure logger
logger = logging.getLogger("notification_worker")
logging.basicConfig(level=logging.INFO)


async def process_notification(value: dict) -> None:
    """Read message details and write a database notification record."""
    user_id_str = value.get("user_id")
    title = value.get("title")
    message = value.get("message")
    notif_type = value.get("notification_type", "info")

    if not user_id_str or not title or not message:
        logger.warning("Notification message missing required fields. Skipping.")
        return

    try:
        user_id = UUID(user_id_str)
    except ValueError:
        logger.error(f"Invalid user UUID format: {user_id_str}")
        return

    async with AsyncSessionLocal() as db:
        try:
            logger.info(f"Creating notification '{title}' for user: {user_id}")
            await NotificationService.create_notification(
                db=db,
                user_id=user_id,
                title=title,
                message=message,
                notification_type=notif_type,
            )
        except Exception as exc:
            logger.error(f"Database error creating notification: {exc}", exc_info=True)


async def main() -> None:
    """Worker loop subscribing to NOTIFICATIONS topic."""
    consumer = KafkaConsumer(
        topics=[Topics.NOTIFICATIONS],
        group_id="notification-worker-group",
    )
    await consumer.start()
    logger.info("Notification Worker started. Listening on topic: notifications")

    try:
        async for message in consumer.consume_messages():
            val = message.get("value", {})
            logger.info(f"Received notification event: {val}")
            await process_notification(val)
    except asyncio.CancelledError:
        logger.info("Notification Worker shutdown requested.")
    finally:
        await consumer.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Exiting on KeyboardInterrupt")
