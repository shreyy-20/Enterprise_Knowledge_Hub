"""
Search and RAG Pydantic schemas.
"""

from uuid import UUID
from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    """Search request criteria."""
    query: str = Field(..., min_length=1)
    search_type: str = Field("hybrid", pattern="^(semantic|hybrid|keyword)$")
    project_id: UUID | None = None
    department_id: UUID | None = None
    file_type: str | None = None  # e.g., PDF, DOCX, TXT, MD
    page: int = Field(1, ge=1)
    size: int = Field(10, ge=1, le=100)


class SearchResult(BaseModel):
    """A single matching search result."""
    document_id: UUID
    chunk_id: UUID
    title: str
    snippet: str
    score: float
    highlights: list[str] | None = None


class SearchResponse(BaseModel):
    """Search query response."""
    results: list[SearchResult]
    total: int
    took_ms: float


class AskRequest(BaseModel):
    """Question answering request using RAG."""
    query: str = Field(..., min_length=1)
    project_id: UUID | None = None


class AskResponse(BaseModel):
    """Question answering response using RAG."""
    answer: str
    sources: list[SearchResult]
