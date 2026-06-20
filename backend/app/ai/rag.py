"""
Unified RAG Pipeline.
"""

from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.prompts import sanitize_prompt
from app.schemas.search import AskResponse, SearchResult
from app.services.search_service import SearchService
from app.services.ai_service import AIService


class RAGPipeline:
    """Combines Hybrid Search and LLM QA generation into a unified RAG workflow."""

    @classmethod
    async def ask(
        cls,
        db: AsyncSession,
        query: str,
        project_id: Optional[UUID] = None,
        limit: int = 5,
    ) -> AskResponse:
        """Run the end-to-end RAG question answering pipeline."""
        # 1. Sanitize user input query to prevent injection
        sanitized_query = sanitize_prompt(query)

        # 2. Retrieve relevant document chunks using hybrid search
        sources = await SearchService.hybrid_search(
            db=db,
            query=sanitized_query,
            project_id=project_id,
            limit=limit,
        )

        if not sources:
            return AskResponse(
                answer="I could not find any documents in the knowledge base related to your query.",
                sources=[],
            )

        # 3. Format chunks for AIService payload
        chunks_payload = [
            {
                "title": source.title,
                "snippet": source.snippet,
            }
            for source in sources
        ]

        # 4. Generate answer from LLM
        answer = await AIService.generate_answer(
            query=sanitized_query,
            chunks=chunks_payload,
        )

        return AskResponse(
            answer=answer,
            sources=sources,
        )
