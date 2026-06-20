"""
Qdrant vector database manager for embedding storage and semantic search.
"""

from typing import Any, Dict, List, Optional

from qdrant_client import AsyncQdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from app.core.config import settings

VECTOR_SIZE = 1536  # OpenAI text-embedding-ada-002 dimension


class QdrantManager:
    """Async Qdrant client wrapper for vector operations."""

    def __init__(
        self,
        host: str = settings.QDRANT_HOST,
        port: int = settings.QDRANT_PORT,
        api_key: Optional[str] = settings.QDRANT_API_KEY or None,
        collection_name: str = settings.QDRANT_COLLECTION,
    ) -> None:
        self._host = host
        self._port = port
        self._api_key = api_key
        self._collection_name = collection_name
        self._client: Optional[AsyncQdrantClient] = None

    async def connect(self) -> None:
        """Initialize the async Qdrant client."""
        self._client = AsyncQdrantClient(
            host=self._host,
            port=self._port,
            api_key=self._api_key,
            timeout=30,
        )

    async def disconnect(self) -> None:
        """Close the Qdrant client connection."""
        if self._client:
            await self._client.close()

    @property
    def client(self) -> AsyncQdrantClient:
        if self._client is None:
            raise RuntimeError("Qdrant client is not connected. Call connect() first.")
        return self._client

    async def create_collection(
        self,
        collection_name: Optional[str] = None,
        vector_size: int = VECTOR_SIZE,
        distance: Distance = Distance.COSINE,
        on_disk: bool = False,
    ) -> bool:
        """Create a Qdrant collection if it does not already exist.

        Returns True if the collection was created, False if it already existed.
        """
        name = collection_name or self._collection_name
        try:
            await self.client.get_collection(name)
            return False  # already exists
        except (UnexpectedResponse, Exception):
            await self.client.create_collection(
                collection_name=name,
                vectors_config=VectorParams(
                    size=vector_size,
                    distance=distance,
                    on_disk=on_disk,
                ),
            )
            return True

    async def upsert_vectors(
        self,
        points: List[Dict[str, Any]],
        collection_name: Optional[str] = None,
        batch_size: int = 100,
    ) -> None:
        """Upsert vectors into the collection.

        Each point dict must have keys: id (str|int), vector (List[float]),
        and optionally payload (Dict).
        """
        name = collection_name or self._collection_name
        point_structs = [
            PointStruct(
                id=p["id"],
                vector=p["vector"],
                payload=p.get("payload", {}),
            )
            for p in points
        ]

        # Batch upsert
        for i in range(0, len(point_structs), batch_size):
            batch = point_structs[i : i + batch_size]
            await self.client.upsert(
                collection_name=name,
                points=batch,
                wait=True,
            )

    async def search(
        self,
        query_vector: List[float],
        limit: int = 10,
        score_threshold: Optional[float] = None,
        filters: Optional[Dict[str, Any]] = None,
        collection_name: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Perform a similarity search and return results.

        Args:
            query_vector: The query embedding vector.
            limit: Maximum number of results.
            score_threshold: Minimum similarity score.
            filters: Optional dict of field conditions, e.g. {"owner_id": "abc"}.
            collection_name: Override the default collection.

        Returns:
            List of dicts with id, score, and payload.
        """
        name = collection_name or self._collection_name

        qdrant_filter = None
        if filters:
            conditions = [
                FieldCondition(key=k, match=MatchValue(value=v))
                for k, v in filters.items()
            ]
            qdrant_filter = Filter(must=conditions)

        results = await self.client.search(
            collection_name=name,
            query_vector=query_vector,
            limit=limit,
            score_threshold=score_threshold,
            query_filter=qdrant_filter,
        )

        return [
            {
                "id": str(hit.id),
                "score": hit.score,
                "payload": hit.payload or {},
            }
            for hit in results
        ]

    async def delete_vectors(
        self,
        point_ids: List[str | int],
        collection_name: Optional[str] = None,
    ) -> None:
        """Delete vectors by their point IDs."""
        name = collection_name or self._collection_name
        await self.client.delete(
            collection_name=name,
            points_selector=point_ids,
            wait=True,
        )


# Module-level singleton
qdrant_manager = QdrantManager()
