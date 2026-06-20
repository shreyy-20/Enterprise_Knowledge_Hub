"""
Embedding Generator using OpenAI API for batch processing.
"""

from typing import List
import logging
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)


class EmbeddingGenerator:
    """Wrapper around OpenAI embeddings with batch support and error tolerance."""

    def __init__(self, batch_size: int = 32) -> None:
        self.batch_size = batch_size

    async def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings in batches of texts."""
        if not texts:
            return []

        embeddings = []
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i : i + self.batch_size]
            try:
                # Call AI service which handles OpenAI interactions
                batch_embeddings = await AIService.generate_embedding(batch)
                
                # Check for single string fallback case in AIService
                if isinstance(batch_embeddings[0], float):
                    embeddings.append(batch_embeddings)
                else:
                    embeddings.extend(batch_embeddings)
            except Exception as exc:
                logger.error(f"Failed to generate embeddings for batch {i//self.batch_size}: {exc}")
                # Fallback to dummy vectors to prevent pipeline crashes
                embeddings.extend([[0.0] * 1536 for _ in batch])

        return embeddings

    async def generate_single_embedding(self, text: str) -> List[float]:
        """Generate an embedding vector for a single text input."""
        res = await AIService.generate_embedding(text)
        # Ensure it's a list of floats (not list of list)
        if res and isinstance(res[0], list):
            return res[0]
        return res
