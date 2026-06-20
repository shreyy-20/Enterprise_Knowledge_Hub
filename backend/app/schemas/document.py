"""
Document Pydantic schemas.
"""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from app.models.document import FileType, DocumentStatus


class DocumentCreate(BaseModel):
    """Document creation payload."""
    title: str = Field(..., max_length=500)
    file_type: FileType
    project_id: UUID | None = None


class DocumentUpdate(BaseModel):
    """Document update payload."""
    title: str | None = Field(None, max_length=500)
    project_id: UUID | None = None
    status: DocumentStatus | None = None
    metadata: dict | None = Field(default=None, alias="metadata_")

    model_config = ConfigDict(
        populate_by_name=True,
    )


class DocumentResponse(BaseModel):
    """Document response schema."""
    id: UUID
    title: str
    file_type: FileType
    file_url: str | None = None
    file_size: int | None = None
    owner_id: UUID | None = None
    owner_name: str | None = None
    project_id: UUID | None = None
    status: DocumentStatus
    metadata: dict | None = Field(default=None, alias="metadata_")
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    @classmethod
    def model_validate(cls, obj: any, **kwargs):
        # Extract owner_name if owner is present
        owner_name = None
        if hasattr(obj, "owner") and obj.owner:
            owner_name = obj.owner.full_name or obj.owner.username

        # Get metadata_ value
        metadata_val = getattr(obj, "metadata_", None)

        data = {
            "id": obj.id,
            "title": obj.title,
            "file_type": obj.file_type,
            "file_url": obj.file_url,
            "file_size": obj.file_size,
            "owner_id": obj.owner_id,
            "owner_name": owner_name,
            "project_id": obj.project_id,
            "status": obj.status,
            "metadata_": metadata_val,
            "created_at": obj.created_at,
            "updated_at": obj.updated_at,
        }
        return cls(**data)


class DocumentListResponse(BaseModel):
    """Paginated list of documents."""
    items: list[DocumentResponse]
    total: int
    page: int
    size: int


class DocumentUploadResponse(BaseModel):
    """Document upload success response."""
    document_id: UUID
    title: str
    status: str


class ChunkResponse(BaseModel):
    """Document chunk response schema."""
    id: UUID
    document_id: UUID
    chunk_index: int
    content: str
    token_count: int | None = None
    metadata: dict | None = Field(default=None, alias="metadata_")

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )

    @classmethod
    def model_validate(cls, obj: any, **kwargs):
        metadata_val = getattr(obj, "metadata_", None)
        data = {
            "id": obj.id,
            "document_id": obj.document_id,
            "chunk_index": obj.chunk_index,
            "content": obj.content,
            "token_count": obj.token_count,
            "metadata_": metadata_val,
        }
        return cls(**data)
