"""
Search API Router.
Handles search requests (semantic, keyword, hybrid), RAG QA requests, and autocomplete suggestions.
"""

from typing import List, Optional
import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.document import Document
from app.schemas.search import SearchRequest, SearchResponse, AskRequest, AskResponse
from app.services.search_service import SearchService
from app.ai.graph import run_rag_graph
from app.core.kafka import kafka_producer, Topics

router = APIRouter()


@router.post("/", response_model=SearchResponse)
async def search_knowledge_base(
    request: SearchRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Search document chunks using semantic, keyword, or hybrid search methods."""
    start_time = time.perf_counter()

    # Determine search method
    if request.search_type == "semantic":
        results = await SearchService.semantic_search(
            db=db,
            query=request.query,
            project_id=request.project_id,
            department_id=request.department_id,
            file_type=request.file_type,
            limit=request.size,
        )
    elif request.search_type == "keyword":
        results = await SearchService.keyword_search(
            db=db,
            query=request.query,
            project_id=request.project_id,
            department_id=request.department_id,
            file_type=request.file_type,
            limit=request.size,
        )
    else:  # hybrid (default)
        results = await SearchService.hybrid_search(
            db=db,
            query=request.query,
            project_id=request.project_id,
            department_id=request.department_id,
            file_type=request.file_type,
            limit=request.size,
        )

    end_time = time.perf_counter()
    took_ms = (end_time - start_time) * 1000.0

    # Publish search event to Kafka analytics
    try:
        await kafka_producer.send_message(
            topic=Topics.ANALYTICS_EVENTS,
            value={
                "user_id": str(current_user.id),
                "event_type": "search",
                "metadata": {
                    "query": request.query,
                    "search_type": request.search_type,
                    "project_id": str(request.project_id) if request.project_id else None,
                    "results_count": len(results),
                    "took_ms": took_ms,
                },
            },
        )
    except Exception:
        pass

    return SearchResponse(
        results=results,
        total=len(results),  # Mock total as count for RRF merged list
        took_ms=took_ms,
    )


@router.post("/ask", response_model=AskResponse)
async def ask_knowledge_base(
    request: AskRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Ask a question using advanced LangGraph RAG pipeline."""
    # Execute the LangGraph workflow (retrieve -> grade -> generate -> refine)
    response = await run_rag_graph(
        db=db,
        query=request.query,
        project_id=request.project_id,
    )

    # Publish QA event to Kafka analytics
    try:
        await kafka_producer.send_message(
            topic=Topics.ANALYTICS_EVENTS,
            value={
                "user_id": str(current_user.id),
                "event_type": "ask",
                "metadata": {
                    "query": request.query,
                    "project_id": str(request.project_id) if request.project_id else None,
                    "sources_count": len(response.sources),
                },
            },
        )
    except Exception:
        pass

    return response


@router.get("/suggestions", response_model=List[str])
async def autocomplete_suggestions(
    q: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve autocomplete suggestions matching query string in document titles."""
    if not q or len(q) < 2:
        return []

    stmt = (
        select(Document.title)
        .where(Document.title.ilike(f"%{q}%"))
        .distinct()
        .limit(6)
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())
