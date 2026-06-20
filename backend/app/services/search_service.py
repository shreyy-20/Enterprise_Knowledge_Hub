"""
Search service containing Semantic, Keyword, and Hybrid Search logic.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
import time
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.qdrant import qdrant_manager
from app.models.document import Document, DocumentChunk
from app.models.user import User
from app.services.ai_service import AIService
from app.schemas.search import SearchResult, SearchResponse


class SearchService:
    """Service to handle vector semantic search, PostgreSQL keyword search, and Hybrid RRF search."""

    @staticmethod
    def _extract_snippet(content: str, query: str, length: int = 250) -> str:
        """Extract a text snippet around the matching query term or return the start of the text."""
        if not query:
            return content[:length] + "..." if len(content) > length else content

        # Search case-insensitively
        match = re.search(re.escape(query), content, re.IGNORECASE)
        if not match:
            # Fallback to splitting query into words
            words = query.split()
            for word in words:
                if len(word) > 3:
                    match = re.search(re.escape(word), content, re.IGNORECASE)
                    if match:
                        break

        if match:
            start_idx = max(0, match.start() - length // 2)
            end_idx = min(len(content), match.end() + length // 2)
            snippet = content[start_idx:end_idx]
            prefix = "..." if start_idx > 0 else ""
            suffix = "..." if end_idx < len(content) else ""
            return prefix + snippet.strip() + suffix

        return content[:length] + "..." if len(content) > length else content

    @classmethod
    async def semantic_search(
        self,
        db: AsyncSession,
        query: str,
        project_id: Optional[UUID] = None,
        department_id: Optional[UUID] = None,
        file_type: Optional[str] = None,
        limit: int = 10,
    ) -> List[SearchResult]:
        """Perform semantic search using OpenAI Embeddings and Qdrant vector database."""
        # 1. Embed query
        query_vector = await AIService.generate_embedding(query)

        # 2. Build filters
        filters = {}
        if project_id:
            filters["project_id"] = str(project_id)
        if department_id:
            filters["department_id"] = str(department_id)
        if file_type:
            filters["file_type"] = file_type.upper()

        # 3. Search Qdrant
        try:
            hits = await qdrant_manager.search(
                query_vector=query_vector,
                limit=limit,
                filters=filters,
            )
        except Exception:
            # Fallback to keyword search if Qdrant is unavailable
            return []

        if not hits:
            return []

        # 4. Fetch chunk & document details from PostgreSQL
        chunk_ids = [UUID(hit["payload"]["chunk_id"]) for hit in hits if "chunk_id" in hit["payload"]]
        if not chunk_ids:
            return []

        # Query Postgres to retrieve fresh DB attributes
        stmt = (
            select(DocumentChunk)
            .options(selectinload(DocumentChunk.document))
            .where(DocumentChunk.id.in_(chunk_ids))
        )
        res = await db.execute(stmt)
        chunks_map = {c.id: c for c in res.scalars().all()}

        results = []
        for hit in hits:
            chunk_id_str = hit["payload"].get("chunk_id")
            if not chunk_id_str:
                continue
            cid = UUID(chunk_id_str)
            chunk = chunks_map.get(cid)
            if not chunk or not chunk.document:
                continue

            results.append(
                SearchResult(
                    document_id=chunk.document_id,
                    chunk_id=chunk.id,
                    title=chunk.document.title,
                    snippet=self._extract_snippet(chunk.content, query),
                    score=hit["score"],
                    highlights=[query] if re.search(re.escape(query), chunk.content, re.IGNORECASE) else [],
                )
            )

        return results

    @classmethod
    async def keyword_search(
        self,
        db: AsyncSession,
        query: str,
        project_id: Optional[UUID] = None,
        department_id: Optional[UUID] = None,
        file_type: Optional[str] = None,
        limit: int = 10,
    ) -> List[SearchResult]:
        """Perform full-text / ILIKE search against PostgreSQL."""
        stmt = (
            select(DocumentChunk)
            .join(Document, DocumentChunk.document_id == Document.id)
            .options(selectinload(DocumentChunk.document))
        )

        # Filters
        conditions = []
        # Search match condition
        search_pattern = f"%{query}%"
        conditions.append(
            (DocumentChunk.content.ilike(search_pattern)) | (Document.title.ilike(search_pattern))
        )

        if project_id:
            conditions.append(Document.project_id == project_id)
        if file_type:
            conditions.append(Document.file_type == file_type.upper())
        if department_id:
            # We join User to check owner's department
            stmt = stmt.join(User, Document.owner_id == User.id, isouter=True)
            conditions.append(User.department_id == department_id)

        for cond in conditions:
            stmt = stmt.where(cond)

        stmt = stmt.limit(limit)
        res = await db.execute(stmt)
        chunks = res.scalars().all()

        results = []
        for idx, chunk in enumerate(chunks):
            # Calculate mock score based on index
            score = 1.0 - (idx * 0.05)
            results.append(
                SearchResult(
                    document_id=chunk.document_id,
                    chunk_id=chunk.id,
                    title=chunk.document.title,
                    snippet=self._extract_snippet(chunk.content, query),
                    score=max(0.1, score),
                    highlights=[query] if re.search(re.escape(query), chunk.content, re.IGNORECASE) else [],
                )
            )

        return results

    @classmethod
    async def hybrid_search(
        self,
        db: AsyncSession,
        query: str,
        project_id: Optional[UUID] = None,
        department_id: Optional[UUID] = None,
        file_type: Optional[str] = None,
        limit: int = 10,
    ) -> List[SearchResult]:
        """Perform Reciprocal Rank Fusion (RRF) on semantic and keyword search results."""
        # 1. Fetch results in parallel/sequence
        semantic_results = await self.semantic_search(
            db=db,
            query=query,
            project_id=project_id,
            department_id=department_id,
            file_type=file_type,
            limit=limit * 2,  # Fetch extra to merge effectively
        )

        keyword_results = await self.keyword_search(
            db=db,
            query=query,
            project_id=project_id,
            department_id=department_id,
            file_type=file_type,
            limit=limit * 2,
        )

        # 2. Apply Reciprocal Rank Fusion (RRF)
        # rrf = sum( 1 / (rank + k) ) where k=60
        k = 60
        rrf_scores = {}  # type: Dict[UUID, float]
        items_map = {}  # type: Dict[UUID, SearchResult]

        for rank, res in enumerate(semantic_results):
            rrf_scores[res.chunk_id] = rrf_scores.get(res.chunk_id, 0.0) + 1.0 / (rank + 1 + k)
            items_map[res.chunk_id] = res

        for rank, res in enumerate(keyword_results):
            rrf_scores[res.chunk_id] = rrf_scores.get(res.chunk_id, 0.0) + 1.0 / (rank + 1 + k)
            if res.chunk_id not in items_map:
                items_map[res.chunk_id] = res

        # 3. Sort by RRF score descending
        sorted_chunk_ids = sorted(rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True)

        results = []
        for cid in sorted_chunk_ids[:limit]:
            item = items_map[cid]
            # Use normalizer or keep the RRF score
            item.score = rrf_scores[cid]
            results.append(item)

        return results
