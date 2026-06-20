# backend/tests/api/test_search.py
"""
Integration tests for Search API endpoints (/search, /search/ask, /search/suggestions).
"""

from unittest.mock import AsyncMock
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

import app.api.v1.search as search_router_mod
from app.core.qdrant import qdrant_manager
from app.models.user import User
from app.models.document import Document, DocumentChunk, FileType, DocumentStatus
from app.services.ai_service import AIService
from app.schemas.search import AskResponse, SearchResult

# Globally mock AI Embedding generation
AIService.generate_embedding = AsyncMock(return_value=[0.1] * 1536)


@pytest.fixture
async def seeded_document_and_chunk(test_db: AsyncSession, test_user: User):
    """Seed a document and document chunk in database for search results validation."""
    doc = Document(
        title="Firewall Policy",
        file_type=FileType.TXT,
        file_url="/tmp/firewall.txt",
        file_size=256,
        status=DocumentStatus.COMPLETED,
        owner_id=test_user.id,
    )
    test_db.add(doc)
    await test_db.flush()

    chunk = DocumentChunk(
        document_id=doc.id,
        content="Only ports 80, 443, and 22 are open to external network interfaces.",
        index=0,
        token_count=15,
    )
    test_db.add(chunk)
    await test_db.commit()
    return doc, chunk


@pytest.mark.asyncio
async def test_semantic_search_success(
    client: AsyncClient,
    auth_headers: dict,
    seeded_document_and_chunk: tuple,
):
    """Test semantic search endpoint returning hydrated DB results from mock Qdrant points."""
    doc, chunk = seeded_document_and_chunk

    # Mock Qdrant manager query response
    qdrant_manager.search = AsyncMock(return_value=[
        {
            "id": "point-uuid-1234",
            "score": 0.92,
            "payload": {
                "chunk_id": str(chunk.id),
                "document_id": str(doc.id),
            }
        }
    ])

    payload = {
        "query": "firewall rules",
        "search_type": "semantic",
        "size": 5
    }

    response = await client.post("/api/v1/search/", json=payload, headers=auth_headers)
    assert response.status_code == 200
    
    data = response.json()
    assert data["total"] == 1
    assert len(data["results"]) == 1
    
    result = data["results"][0]
    assert result["document_id"] == str(doc.id)
    assert result["chunk_id"] == str(chunk.id)
    assert result["title"] == "Firewall Policy"
    assert "ports 80, 443" in result["snippet"]
    assert result["score"] == 0.92


@pytest.mark.asyncio
async def test_keyword_search_success(
    client: AsyncClient,
    auth_headers: dict,
    seeded_document_and_chunk: tuple,
):
    """Test standard keyword search via SQL ILIKE query fallback."""
    doc, chunk = seeded_document_and_chunk
    
    payload = {
        "query": "ports 80",
        "search_type": "keyword",
        "size": 5
    }
    
    response = await client.post("/api/v1/search/", json=payload, headers=auth_headers)
    assert response.status_code == 200
    
    data = response.json()
    assert len(data["results"]) >= 1
    assert data["results"][0]["title"] == "Firewall Policy"


@pytest.mark.asyncio
async def test_hybrid_search_success(
    client: AsyncClient,
    auth_headers: dict,
    seeded_document_and_chunk: tuple,
):
    """Test hybrid search combining semantic results and keyword results with RRF ranking."""
    doc, chunk = seeded_document_and_chunk

    # Mock Qdrant semantic search hits
    qdrant_manager.search = AsyncMock(return_value=[
        {
            "id": "point-uuid-1234",
            "score": 0.88,
            "payload": {
                "chunk_id": str(chunk.id),
                "document_id": str(doc.id),
            }
        }
    ])

    payload = {
        "query": "firewall external",
        "search_type": "hybrid",
        "size": 5
    }

    response = await client.post("/api/v1/search/", json=payload, headers=auth_headers)
    assert response.status_code == 200
    
    data = response.json()
    assert len(data["results"]) >= 1
    # First item should match our seeded chunk
    assert data["results"][0]["chunk_id"] == str(chunk.id)


@pytest.mark.asyncio
async def test_ask_rag_workflow(
    client: AsyncClient,
    auth_headers: dict,
    seeded_document_and_chunk: tuple,
):
    """Test RAG QA endpoint with mocked LangGraph pipeline."""
    doc, chunk = seeded_document_and_chunk

    # Mock run_rag_graph call inside the search router module
    search_router_mod.run_rag_graph = AsyncMock(return_value=AskResponse(
        answer="According to the firewall policy, only ports 80, 443, and 22 are open.",
        sources=[
            SearchResult(
                document_id=doc.id,
                chunk_id=chunk.id,
                title=doc.title,
                snippet="Only ports 80, 443, and 22 are open to external network interfaces.",
                score=0.95
            )
        ]
    ))

    payload = {
        "query": "Which ports are open in the firewall?",
    }

    response = await client.post("/api/v1/search/ask", json=payload, headers=auth_headers)
    assert response.status_code == 200
    
    data = response.json()
    assert "firewall policy" in data["answer"]
    assert len(data["sources"]) == 1
    assert data["sources"][0]["title"] == "Firewall Policy"


@pytest.mark.asyncio
async def test_autocomplete_suggestions(
    client: AsyncClient,
    auth_headers: dict,
    seeded_document_and_chunk: tuple,
):
    """Test the autocomplete suggestions endpoint matches document titles."""
    doc, _ = seeded_document_and_chunk

    response = await client.get("/api/v1/search/suggestions?q=Fire", headers=auth_headers)
    assert response.status_code == 200
    
    data = response.json()
    assert len(data) >= 1
    assert "Firewall Policy" in data
