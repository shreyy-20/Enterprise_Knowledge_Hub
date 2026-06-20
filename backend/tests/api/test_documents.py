# backend/tests/api/test_documents.py
"""
Integration tests for Document API endpoints (/upload, /list, /delete, /summarize).
"""

import os
import shutil
import pytest
from unittest.mock import AsyncMock
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.document import Document, FileType, DocumentStatus
from app.services.ai_service import AIService
from app.api.v1.documents import STORAGE_DIR

# Mock the AI summarization service call globally for tests
AIService.summarize_document = AsyncMock(return_value="This is a mock summary of the document.")


@pytest.fixture(autouse=True)
def clean_test_storage():
    """Ensure the local document storage directory is clean before and after tests."""
    os.makedirs(STORAGE_DIR, exist_ok=True)
    yield
    # Cleanup files inside storage
    if os.path.exists(STORAGE_DIR):
        for filename in os.listdir(STORAGE_DIR):
            file_path = os.path.join(STORAGE_DIR, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            except Exception:
                pass


@pytest.mark.asyncio
async def test_upload_document_success(client: AsyncClient, test_user: User, auth_headers: dict, test_db: AsyncSession):
    """Test standard document upload flow."""
    files = {"file": ("sample.txt", b"This is some text content for the upload test.", "text/plain")}
    data = {"title": "Sample Manual"}
    
    response = await client.post(
        "/api/v1/documents/upload",
        files=files,
        data=data,
        headers=auth_headers
    )
    
    assert response.status_code == 201
    res_data = response.json()
    assert res_data["title"] == "Sample Manual"
    assert res_data["status"] == "uploaded"
    assert "document_id" in res_data
    
    # Check that file was written to disk
    # Filename will contain uuid prefix, list files in storage to verify
    saved_files = os.listdir(STORAGE_DIR)
    assert len(saved_files) == 1
    assert "sample.txt" in saved_files[0]


@pytest.mark.asyncio
async def test_list_documents(client: AsyncClient, test_user: User, auth_headers: dict, test_db: AsyncSession):
    """Test retrieving a list of document metadata."""
    # Seed a document first
    doc = Document(
        title="Existing Guide",
        file_type=FileType.TXT,
        file_url="/tmp/existing.txt",
        file_size=256,
        status=DocumentStatus.COMPLETED,
        owner_id=test_user.id,
    )
    test_db.add(doc)
    await test_db.commit()

    response = await client.get("/api/v1/documents/", headers=auth_headers)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["total"] >= 1
    assert any(d["title"] == "Existing Guide" for d in res_data["items"])


@pytest.mark.asyncio
async def test_delete_document_permissions(
    client: AsyncClient,
    test_user: User,
    test_admin: User,
    auth_headers: dict,
    admin_headers: dict,
    test_db: AsyncSession,
):
    """Test RBAC delete permissions (standard user cannot delete other's document, admin can)."""
    # 1. Create a document owned by the admin user
    admin_doc = Document(
        title="Admin Secret Document",
        file_type=FileType.PDF,
        file_url="/tmp/admin_doc.pdf",
        file_size=1024,
        status=DocumentStatus.COMPLETED,
        owner_id=test_admin.id,
    )
    test_db.add(admin_doc)
    await test_db.commit()

    # 2. Try deleting it as the standard user -> should fail (403)
    response = await client.delete(f"/api/v1/documents/{admin_doc.id}", headers=auth_headers)
    assert response.status_code == 403
    assert "You do not have permission" in response.json()["detail"]

    # 3. Delete it as the admin user -> should succeed (204)
    response = await client.delete(f"/api/v1/documents/{admin_doc.id}", headers=admin_headers)
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_summarize_document_completed_only(client: AsyncClient, test_user: User, auth_headers: dict, test_db: AsyncSession):
    """Test that summarization works for COMPLETED documents and rejects PENDING ones."""
    # 1. Create a pending document
    pending_doc = Document(
        title="Pending Specs",
        file_type=FileType.TXT,
        file_url="/tmp/pending.txt",
        file_size=128,
        status=DocumentStatus.PENDING,
        owner_id=test_user.id,
    )
    # 2. Create a completed document
    completed_doc = Document(
        title="Completed Manual",
        file_type=FileType.TXT,
        file_url="/tmp/completed.txt",
        file_size=128,
        content="This is the full text of the complete manual.",
        status=DocumentStatus.COMPLETED,
        owner_id=test_user.id,
    )
    test_db.add_all([pending_doc, completed_doc])
    await test_db.commit()

    # 3. Call summarize on pending document -> should fail (400)
    response = await client.post(f"/api/v1/documents/{pending_doc.id}/summarize", headers=auth_headers)
    assert response.status_code == 400
    assert "ingestion is not completed" in response.json()["detail"]

    # 4. Call summarize on completed document -> should succeed (200)
    response = await client.post(f"/api/v1/documents/{completed_doc.id}/summarize", headers=auth_headers)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["document_id"] == str(completed_doc.id)
    assert res_data["summary"] == "This is a mock summary of the document."
