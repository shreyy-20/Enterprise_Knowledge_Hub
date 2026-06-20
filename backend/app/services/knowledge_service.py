"""
Knowledge and Document Management Service.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete, func

from app.core.kafka import kafka_producer, Topics
from app.core.qdrant import qdrant_manager
from app.models.document import Document, DocumentChunk, Embedding, KnowledgeSource, FileType, DocumentStatus
from app.models.project import Project, ProjectMember, ProjectStatus
from app.models.user import User
from app.schemas.document import DocumentCreate, DocumentUpdate
from app.schemas.project import ProjectCreate, ProjectUpdate


class KnowledgeService:
    """Service to manage projects, documents, document chunks, and knowledge sources."""

    # ---------------------------------------------------------------------------
    # Document CRUD
    # ---------------------------------------------------------------------------

    @staticmethod
    async def create_document(
        db: AsyncSession,
        doc_create: DocumentCreate,
        owner_id: UUID,
        file_url: Optional[str] = None,
        file_size: Optional[int] = None,
    ) -> Document:
        """Create database entry for document and publish ingestion message to Kafka."""
        # Ensure project exists if project_id is provided
        if doc_create.project_id:
            project_query = select(Project).where(Project.id == doc_create.project_id)
            project_res = await db.execute(project_query)
            if not project_res.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found",
                )

        new_doc = Document(
            title=doc_create.title,
            file_type=doc_create.file_type,
            file_url=file_url,
            file_size=file_size,
            owner_id=owner_id,
            project_id=doc_create.project_id,
            status=DocumentStatus.PENDING,
            metadata_={},
        )

        db.add(new_doc)
        await db.commit()
        await db.refresh(new_doc)

        # Trigger Ingestion Worker via Kafka
        try:
            await kafka_producer.send_message(
                topic=Topics.DOCUMENT_INGESTION,
                value={"document_id": str(new_doc.id)},
                key=str(new_doc.id),
            )
        except Exception as exc:
            # log or handle Kafka failure, but don't fail the HTTP transaction
            # we can mark document status as FAILED or leave it PENDING
            pass

        return new_doc

    @staticmethod
    async def get_document(db: AsyncSession, doc_id: UUID) -> Optional[Document]:
        """Fetch a single document by ID."""
        query = select(Document).where(Document.id == doc_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_documents(
        db: AsyncSession,
        project_id: Optional[UUID] = None,
        owner_id: Optional[UUID] = None,
        status_filter: Optional[DocumentStatus] = None,
        page: int = 1,
        size: int = 10,
    ) -> tuple[List[Document], int]:
        """Paginated search for documents with optional filtering."""
        query = select(Document)

        if project_id:
            query = query.where(Document.project_id == project_id)
        if owner_id:
            query = query.where(Document.owner_id == owner_id)
        if status_filter:
            query = query.where(Document.status == status_filter)

        # Count total matching records
        count_query = select(func.count()).select_from(query.subquery())
        count_res = await db.execute(count_query)
        total = count_res.scalar() or 0

        # Pagination and sorting
        offset = (page - 1) * size
        query = query.order_by(Document.created_at.desc()).offset(offset).limit(size)
        result = await db.execute(query)
        items = result.scalars().all()

        return list(items), total

    @staticmethod
    async def update_document(
        db: AsyncSession, doc: Document, doc_update: DocumentUpdate
    ) -> Document:
        """Update document attributes and metadata."""
        if doc_update.title is not None:
            doc.title = doc_update.title
        if doc_update.project_id is not None:
            doc.project_id = doc_update.project_id
        if doc_update.status is not None:
            doc.status = doc_update.status
        if doc_update.metadata is not None:
            # Keep existing metadata and merge updates
            current_metadata = doc.metadata_ or {}
            current_metadata.update(doc_update.metadata)
            doc.metadata_ = current_metadata

        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        return doc

    @staticmethod
    async def delete_document(db: AsyncSession, doc: Document) -> None:
        """Delete document from SQL and delete its corresponding vector points in Qdrant."""
        # Find all associated chunk embeddings to clean up Qdrant
        chunk_query = select(DocumentChunk).where(DocumentChunk.document_id == doc.id)
        chunk_res = await db.execute(chunk_query)
        chunks = chunk_res.scalars().all()

        vector_ids = []
        for chunk in chunks:
            # Query the embedding to find vector_id
            embedding_query = select(Embedding).where(Embedding.chunk_id == chunk.id)
            embedding_res = await db.execute(embedding_query)
            embedding = embedding_res.scalar_one_or_none()
            if embedding:
                vector_ids.append(embedding.vector_id)

        # Delete from Qdrant first
        if vector_ids:
            try:
                await qdrant_manager.delete_vectors(point_ids=vector_ids)
            except Exception:
                # If Qdrant is offline, log and proceed so database delete doesn't get blocked
                pass

        # Database delete (Cascades to DocumentChunk and Embedding tables in PG)
        await db.delete(doc)
        await db.commit()

    @staticmethod
    async def trigger_reingestion(db: AsyncSession, doc: Document) -> Document:
        """Reset document status to processing and republish to Kafka ingestion topic."""
        doc.status = DocumentStatus.PENDING
        db.add(doc)
        await db.commit()
        await db.refresh(doc)

        await kafka_producer.send_message(
            topic=Topics.DOCUMENT_INGESTION,
            value={"document_id": str(doc.id)},
            key=str(doc.id),
        )
        return doc

    # ---------------------------------------------------------------------------
    # Project CRUD
    # ---------------------------------------------------------------------------

    @staticmethod
    async def create_project(db: AsyncSession, proj_create: ProjectCreate) -> Project:
        """Create a new project."""
        project = Project(
            name=proj_create.name,
            description=proj_create.description,
            status=ProjectStatus.ACTIVE,
            department_id=proj_create.department_id,
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project

    @staticmethod
    async def get_project(db: AsyncSession, proj_id: UUID) -> Optional[Project]:
        """Fetch project details by ID."""
        query = select(Project).where(Project.id == proj_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_projects(
        db: AsyncSession, department_id: Optional[UUID] = None
    ) -> List[Project]:
        """Fetch all projects, optionally filtered by department."""
        query = select(Project)
        if department_id:
            query = query.where(Project.department_id == department_id)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update_project(
        db: AsyncSession, project: Project, proj_update: ProjectUpdate
    ) -> Project:
        """Update project details."""
        if proj_update.name is not None:
            project.name = proj_update.name
        if proj_update.description is not None:
            project.description = proj_update.description
        if proj_update.status is not None:
            project.status = proj_update.status

        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project

    @staticmethod
    async def delete_project(db: AsyncSession, project: Project) -> None:
        """Delete a project."""
        await db.delete(project)
        await db.commit()

    @staticmethod
    async def add_project_member(
        db: AsyncSession, project_id: UUID, user_id: UUID, role: str = "member"
    ) -> ProjectMember:
        """Add a member to a project."""
        # Ensure user exists
        user_query = select(User).where(User.id == user_id)
        user_res = await db.execute(user_query)
        if not user_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        # Check if already a member
        member_query = select(ProjectMember).where(
            ProjectMember.project_id == project_id, ProjectMember.user_id == user_id
        )
        member_res = await db.execute(member_query)
        existing = member_res.scalar_one_or_none()
        if existing:
            existing.role = role
            db.add(existing)
            await db.commit()
            await db.refresh(existing)
            return existing

        new_member = ProjectMember(
            project_id=project_id,
            user_id=user_id,
            role=role,
        )
        db.add(new_member)
        await db.commit()
        await db.refresh(new_member)
        return new_member

    @staticmethod
    async def remove_project_member(
        db: AsyncSession, project_id: UUID, user_id: UUID
    ) -> None:
        """Remove a member from a project."""
        stmt = delete(ProjectMember).where(
            ProjectMember.project_id == project_id, ProjectMember.user_id == user_id
        )
        await db.execute(stmt)
        await db.commit()

    # ---------------------------------------------------------------------------
    # KnowledgeSource CRUD
    # ---------------------------------------------------------------------------

    @staticmethod
    async def create_knowledge_source(
        db: AsyncSession, name: str, source_type: str, config: Dict[str, Any]
    ) -> KnowledgeSource:
        """Create a third-party synced knowledge source entry."""
        ks = KnowledgeSource(
            name=name,
            source_type=source_type,
            config=config,
            status="active",
        )
        db.add(ks)
        await db.commit()
        await db.refresh(ks)
        return ks

    @staticmethod
    async def get_knowledge_source(
        db: AsyncSession, ks_id: UUID
    ) -> Optional[KnowledgeSource]:
        """Retrieve a knowledge source configuration by ID."""
        query = select(KnowledgeSource).where(KnowledgeSource.id == ks_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_knowledge_sources(db: AsyncSession) -> List[KnowledgeSource]:
        """Retrieve all knowledge source configurations."""
        query = select(KnowledgeSource)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update_knowledge_source(
        db: AsyncSession, ks: KnowledgeSource, name: Optional[str] = None, config: Optional[Dict[str, Any]] = None, status: Optional[str] = None
    ) -> KnowledgeSource:
        """Update a knowledge source configuration."""
        if name is not None:
            ks.name = name
        if config is not None:
            ks.config = config
        if status is not None:
            ks.status = status

        db.add(ks)
        await db.commit()
        await db.refresh(ks)
        return ks

    @staticmethod
    async def delete_knowledge_source(db: AsyncSession, ks: KnowledgeSource) -> None:
        """Delete a knowledge source configuration."""
        await db.delete(ks)
        await db.commit()
