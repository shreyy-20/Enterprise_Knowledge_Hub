"""
Kafka producer and consumer wrappers using aiokafka with JSON serialization.
"""

import enum
import json
from typing import Any, AsyncGenerator, Callable, Dict, List, Optional

from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

from app.core.config import settings


class Topics(str, enum.Enum):
    """Kafka topic names used across the application."""

    DOCUMENT_INGESTION = "document.ingestion"
    EMBEDDING_GENERATION = "embedding.generation"
    NOTIFICATIONS = "notifications"
    ANALYTICS_EVENTS = "analytics.events"


def _json_serializer(value: Any) -> bytes:
    """Serialize a Python object to JSON bytes."""
    return json.dumps(value, default=str).encode("utf-8")


def _json_deserializer(raw: bytes) -> Any:
    """Deserialize JSON bytes to a Python object."""
    return json.loads(raw.decode("utf-8"))


class KafkaProducer:
    """Async Kafka producer with JSON serialization."""

    def __init__(
        self,
        bootstrap_servers: str = settings.KAFKA_BOOTSTRAP_SERVERS,
    ) -> None:
        self._bootstrap_servers = bootstrap_servers
        self._producer: Optional[AIOKafkaProducer] = None

    async def start(self) -> None:
        """Start the Kafka producer."""
        self._producer = AIOKafkaProducer(
            bootstrap_servers=self._bootstrap_servers,
            value_serializer=_json_serializer,
            key_serializer=lambda k: k.encode("utf-8") if k else None,
            acks="all",
            retry_backoff_ms=100,
            max_batch_size=16384,
        )
        await self._producer.start()

    async def stop(self) -> None:
        """Stop the Kafka producer and flush pending messages."""
        if self._producer:
            await self._producer.stop()

    async def send_message(
        self,
        topic: str | Topics,
        value: Dict[str, Any],
        key: Optional[str] = None,
        headers: Optional[List[tuple]] = None,
    ) -> Any:
        """Send a message to a Kafka topic.

        Args:
            topic: The topic name or Topics enum value.
            value: The message body (will be JSON-serialized).
            key: Optional message key for partitioning.
            headers: Optional list of (header_name, header_value) tuples.

        Returns:
            RecordMetadata of the sent message.
        """
        if self._producer is None:
            raise RuntimeError("Kafka producer is not started. Call start() first.")

        topic_name = topic.value if isinstance(topic, Topics) else topic
        serialized_headers = None
        if headers:
            serialized_headers = [
                (h[0], h[1].encode("utf-8") if isinstance(h[1], str) else h[1])
                for h in headers
            ]

        return await self._producer.send_and_wait(
            topic_name,
            value=value,
            key=key,
            headers=serialized_headers,
        )


class KafkaConsumer:
    """Async Kafka consumer with JSON deserialization."""

    def __init__(
        self,
        topics: List[str | Topics],
        group_id: str = "knowledge-hub-group",
        bootstrap_servers: str = settings.KAFKA_BOOTSTRAP_SERVERS,
    ) -> None:
        self._bootstrap_servers = bootstrap_servers
        self._topics = [t.value if isinstance(t, Topics) else t for t in topics]
        self._group_id = group_id
        self._consumer: Optional[AIOKafkaConsumer] = None

    async def start(self) -> None:
        """Start the Kafka consumer."""
        self._consumer = AIOKafkaConsumer(
            *self._topics,
            bootstrap_servers=self._bootstrap_servers,
            group_id=self._group_id,
            value_deserializer=_json_deserializer,
            key_deserializer=lambda k: k.decode("utf-8") if k else None,
            auto_offset_reset="earliest",
            enable_auto_commit=True,
            auto_commit_interval_ms=1000,
        )
        await self._consumer.start()

    async def stop(self) -> None:
        """Stop the Kafka consumer."""
        if self._consumer:
            await self._consumer.stop()

    async def consume_messages(
        self,
        handler: Optional[Callable] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Consume messages from subscribed topics.

        If a handler callable is provided, each message is passed to it.
        Otherwise messages are yielded as dicts.
        """
        if self._consumer is None:
            raise RuntimeError("Kafka consumer is not started. Call start() first.")

        async for message in self._consumer:
            msg_data: Dict[str, Any] = {
                "topic": message.topic,
                "partition": message.partition,
                "offset": message.offset,
                "key": message.key,
                "value": message.value,
                "timestamp": message.timestamp,
            }
            if handler:
                await handler(msg_data)
            else:
                yield msg_data


# Module-level singletons
kafka_producer = KafkaProducer()
kafka_consumer: Optional[KafkaConsumer] = None
