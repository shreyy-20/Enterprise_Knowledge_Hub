"""
Document, DocumentChunk, Embedding, and KnowledgeSource models.
"""

import enum
import uuid

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class FileType(str, enum.Enum):
    """Supported document file types."""

    PDF = "PDF"
    DOCX = "DOCX"
    TXT = "TXT"
    MD = "MD"


class DocumentStatus(str, enum.Enum):
    """Document processing pipeline status."""

    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class SourceType(str, enum.Enum):
    """Knowledge source integration type."""

    UPLOAD = "UPLOAD"
    CONFLUENCE = "CONFLUENCE"
    SHAREPOINT = "SHAREPOINT"
    GITHUB = "GITHUB"
    API = "API"


class Document(Base):
    """A knowledge document uploaded or synced into the system."""

    __tablename__ = "documents"
    __table_args__ = (
        Index("ix_documents_title", "title"),
        Index("ix_documents_status", "status"),
        Index("ix_documents_owner_id", "owner_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    content = Column(Text, nullable=True)
    file_type = Column(Enum(FileType, name="file_type_enum"), nullable=False)
    file_url = Column(String(1024), nullable=True)
    file_size = Column(Integer, nullable=True)
    owner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
    )
    status = Column(
        Enum(DocumentStatus, name="document_status_enum"),
        default=DocumentStatus.PENDING,
        nullable=False,
    )
    metadata_ = Column("metadata", JSON, nullable=True, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    owner = relationship("User", back_populates="documents", lazy="selectin")
    project = relationship("Project", back_populates="documents", lazy="selectin")
    chunks = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Document {self.title}>"


class DocumentChunk(Base):
    """A text chunk of a document for embedding and retrieval."""

    __tablename__ = "document_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=True)
    metadata_ = Column("metadata", JSON, nullable=True, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    document = relationship("Document", back_populates="chunks", lazy="selectin")
    embedding = relationship(
        "Embedding",
        back_populates="chunk",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<DocumentChunk doc={self.document_id} idx={self.chunk_index}>"


class Embedding(Base):
    """A vector embedding linked to a document chunk and stored in Qdrant."""

    __tablename__ = "embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chunk_id = Column(
        UUID(as_uuid=True),
        ForeignKey("document_chunks.id", ondelete="CASCADE"),
        nullable=False,
    )
    vector_id = Column(String(255), nullable=False)
    model_name = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    chunk = relationship("DocumentChunk", back_populates="embedding", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Embedding vector_id={self.vector_id}>"


class KnowledgeSource(Base):
    """External knowledge source configuration for data ingestion."""

    __tablename__ = "knowledge_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    source_type = Column(Enum(SourceType, name="source_type_enum"), nullable=False)
    config = Column(JSON, nullable=True, default=dict)
    last_synced = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="active", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self) -> str:
        return f"<KnowledgeSource {self.name}>"
