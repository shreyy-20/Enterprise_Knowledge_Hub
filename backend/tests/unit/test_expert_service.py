# backend/tests/unit/test_expert_service.py
"""
Unit tests for ExpertService calculations, scoring algorithms, and profile aggregation.
"""

from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.user import User
from app.models.document import Document, FileType, DocumentStatus
from app.models.project import Project, ProjectMember
from app.models.analytics import AnalyticsEvent
from app.models.expert import Expert
from app.services.expert_service import ExpertService


@pytest.mark.asyncio
async def test_calculate_expert_profiles(test_db: AsyncSession):
    """Test expert ranking, weighting, scoring logic, and normalization."""
    # 1. Setup multiple users
    user1 = User(
        email="expert1@company.com",
        username="expertone",
        full_name="Expert One",
        hashed_password="hashedpassword123",
        is_active=True,
    )
    user2 = User(
        email="expert2@company.com",
        username="experttwo",
        full_name="Expert Two",
        hashed_password="hashedpassword123",
        is_active=True,
    )
    test_db.add_all([user1, user2])
    await test_db.flush()

    # 2. Add Documents for User 1 (doc weight: 10.0 per doc)
    # User 1 has 2 documents -> doc_score = 20.0
    doc1 = Document(
        title="Kubernetes Security Manual",
        file_type=FileType.MD,
        file_url="/tmp/k8s.md",
        file_size=1024,
        status=DocumentStatus.COMPLETED,
        owner_id=user1.id,
        metadata_={"topics": ["kubernetes", "security"]}
    )
    doc2 = Document(
        title="Docker Security Hardening",
        file_type=FileType.MD,
        file_url="/tmp/docker.md",
        file_size=512,
        status=DocumentStatus.COMPLETED,
        owner_id=user1.id,
        metadata_={"topics": ["docker", "security"]}
    )
    test_db.add_all([doc1, doc2])

    # 3. Add Project Memberships (project weight: 15.0 per involvement)
    proj1 = Project(name="Security Audit", description="Security checking project")
    test_db.add(proj1)
    await test_db.flush()

    # User 1 is in 1 project -> contrib_score = 15.0
    pm1 = ProjectMember(project_id=proj1.id, user_id=user1.id, role="lead")
    # User 2 is in 1 project -> contrib_score = 15.0
    pm2 = ProjectMember(project_id=proj1.id, user_id=user2.id, role="member")
    test_db.add_all([pm1, pm2])

    # 4. Add Analytics Events in last 30 days (activity weight: 5.0 per event)
    # User 1 has 1 event -> activity_score = 5.0
    # Raw Score User 1: doc_score (20) + contrib_score (15) + activity_score (5) = 40.0
    ev1 = AnalyticsEvent(
        event_type="search",
        user_id=user1.id,
        created_at=datetime.now(timezone.utc) - timedelta(days=2)
    )
    # User 2 has 2 events -> activity_score = 10.0
    # Raw Score User 2: doc_score (0) + contrib_score (15) + activity_score (10) = 25.0
    ev2 = AnalyticsEvent(
        event_type="view_document",
        user_id=user2.id,
        created_at=datetime.now(timezone.utc) - timedelta(days=5)
    )
    ev3 = AnalyticsEvent(
        event_type="search",
        user_id=user2.id,
        created_at=datetime.now(timezone.utc) - timedelta(days=10)
    )
    test_db.add_all([ev1, ev2, ev3])
    await test_db.flush()

    # 5. Run scoring algorithm
    await ExpertService.calculate_expert_profiles(test_db)

    # 6. Retrieve computed expert records
    expert1 = await ExpertService.get_expert_by_user_id(test_db, user1.id)
    expert2 = await ExpertService.get_expert_by_user_id(test_db, user2.id)

    assert expert1 is not None
    assert expert2 is not None

    # Max raw score is 40.0 (User 1)
    # User 1 normalized score should be 100.0
    assert expert1.expertise_score == 100.0
    assert expert1.document_count == 2
    assert expert1.contribution_count == 1
    assert expert1.activity_score == 5.0
    # Validate topics extraction
    assert "security" in expert1.topics
    assert "kubernetes" in expert1.topics

    # User 2 raw score is 25.0
    # User 2 normalized score should be (25.0 / 40.0) * 100.0 = 62.5
    assert expert2.expertise_score == 62.5
    assert expert2.document_count == 0
    assert expert2.contribution_count == 1
    assert expert2.activity_score == 10.0

    # 7. Check list sorting and topics retrieval
    top_experts = await ExpertService.list_top_experts(test_db, limit=10)
    assert len(top_experts) == 2
    # Sorted descending by score
    assert top_experts[0].user_id == user1.id
    assert top_experts[1].user_id == user2.id
