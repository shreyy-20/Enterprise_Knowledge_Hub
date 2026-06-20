"""
Documents API Router.
Handles document uploads, listing, downloading, deleting, re-ingestion, and summarization.
"""

import os
import shutil
import uuid
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.models.document import FileType, DocumentStatus
from app.models.user import User
from app.schemas.document import (
    DocumentResponse,
    DocumentListResponse,
    DocumentUploadResponse,
    DocumentCreate,
    DocumentUpdate,
)
from app.services.knowledge_service import KnowledgeService
from app.services.ai_service import AIService

router = APIRouter()

STORAGE_DIR = os.path.abspath("./storage/documents")
os.makedirs(STORAGE_DIR, exist_ok=True)


def _detect_file_type(filename: str) -> FileType:
    """Helper to detect file type from file extension."""
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        return FileType.PDF
    elif ext == ".docx":
        return FileType.DOCX
    elif ext == ".txt":
        return FileType.TXT
    elif ext in [".md", ".markdown"]:
        return FileType.MD
    
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported file format. System supports PDF, DOCX, TXT, MD. Got: {ext}",
    )


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    project_id: Optional[UUID] = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a document file, write to disk, and trigger ingestion."""
    # 1. Detect file type
    file_type = _detect_file_type(file.filename)

    # 2. Generate unique filename and save to storage
    file_uuid = uuid.uuid4()
    filename_on_disk = f"{file_uuid}_{file.filename}"
    file_path = os.path.join(STORAGE_DIR, filename_on_disk)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to write file to storage: {str(exc)}",
        )

    # Get file size
    file_size = os.path.getsize(file_path)

    # 3. Create document record in DB and publish ingestion event to Kafka
    doc_title = title or os.path.splitext(file.filename)[0]
    doc_create = DocumentCreate(
        title=doc_title,
        file_type=file_type,
        project_id=project_id,
    )

    doc = await KnowledgeService.create_document(
        db=db,
        doc_create=doc_create,
        owner_id=current_user.id,
        file_url=file_path,  # Store absolute local path for ingestion worker access
        file_size=file_size,
    )

    return DocumentUploadResponse(
        document_id=doc.id,
        title=doc.title,
        status="uploaded",
    )


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    project_id: Optional[UUID] = None,
    owner_id: Optional[UUID] = None,
    status_filter: Optional[DocumentStatus] = None,
    page: int = 1,
    size: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve list of metadata for documents with pagination."""
    items, total = await KnowledgeService.list_documents(
        db=db,
        project_id=project_id,
        owner_id=owner_id,
        status_filter=status_filter,
        page=page,
        size=size,
    )
    
    response_items = [DocumentResponse.model_validate(item) for item in items]
    return DocumentListResponse(items=response_items, total=total, page=page, size=size)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve metadata of a single document by its UUID."""
    doc = await KnowledgeService.get_document(db=db, doc_id=document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse.model_validate(doc)


@router.get("/{document_id}/download")
async def download_document(
    document_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Download the actual document file."""
    doc = await KnowledgeService.get_document(db=db, doc_id=document_id)
    if not doc or not doc.file_url:
        raise HTTPException(status_code=404, detail="Document or file content not found")

    if not os.path.exists(doc.file_url):
        raise HTTPException(
            status_code=404,
            detail="File has been removed or is unavailable on disk.",
        )

    # Use original filename from path
    original_filename = os.path.basename(doc.file_url).split("_", 1)[-1]
    return FileResponse(
        path=doc.file_url,
        filename=original_filename,
        media_type="application/octet-stream",
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a document, its database records, and Qdrant embeddings."""
    doc = await KnowledgeService.get_document(db=db, doc_id=document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Access control: Owner or Admin
    is_admin = any(role.name.lower() == "admin" for role in current_user.roles)
    if doc.owner_id != current_user.id and not current_user.is_superuser and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this document",
        )

    # Delete physical file from disk
    if doc.file_url and os.path.exists(doc.file_url):
        try:
            os.remove(doc.file_url)
        except Exception:
            pass

    # Delete database references and clean Qdrant
    await KnowledgeService.delete_document(db=db, doc=doc)


@router.post("/{document_id}/reingest", response_model=DocumentResponse)
async def reingest_document(
    document_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger the text extraction and re-embedding pipeline for a document."""
    doc = await KnowledgeService.get_document(db=db, doc_id=document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    updated_doc = await KnowledgeService.trigger_reingestion(db=db, doc=doc)
    return DocumentResponse.model_validate(updated_doc)


@router.post("/{document_id}/summarize")
async def summarize_document(
    document_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate a structured summary of the document (requires COMPLETED ingestion)."""
    doc = await KnowledgeService.get_document(db=db, doc_id=document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.status != DocumentStatus.COMPLETED or not doc.content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document ingestion is not completed. Summary unavailable.",
        )

    summary = await AIService.summarize_document(doc.content)
    return {"document_id": doc.id, "summary": summary}
