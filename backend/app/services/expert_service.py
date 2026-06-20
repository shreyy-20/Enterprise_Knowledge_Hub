"""
Expert Service.
Implements subject-matter expert identification, scoring, profiling, and topics aggregation.
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc

from app.models.user import User
from app.models.document import Document
from app.models.project import ProjectMember
from app.models.analytics import AnalyticsEvent
from app.models.expert import Expert
from app.services.ai_service import AIService


class ExpertService:
    """Service to calculate and manage subject-matter expert scores and profiles."""

    @classmethod
    async def calculate_expert_profiles(cls, db: AsyncSession) -> None:
        """Run the expert ranking algorithm for all active users and update the experts table."""
        # 1. Fetch all active users
        user_query = select(User).where(User.is_active == True)
        user_res = await db.execute(user_query)
        users = user_res.scalars().all()

        if not users:
            return

        raw_scores = {}  # type: dict[UUID, dict]
        max_raw_score = 0.0

        # Calculate scores for each user
        for user in users:
            # Document Ownership Count
            doc_query = select(func.count(Document.id)).where(Document.owner_id == user.id)
            doc_res = await db.execute(doc_query)
            doc_count = doc_res.scalar() or 0

            # Project contributions (involvements)
            proj_query = select(func.count(ProjectMember.project_id)).where(ProjectMember.user_id == user.id)
            proj_res = await db.execute(proj_query)
            contrib_count = proj_res.scalar() or 0

            # Activity count in last 30 days
            thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
            act_query = select(func.count(AnalyticsEvent.id)).where(
                AnalyticsEvent.user_id == user.id,
                AnalyticsEvent.created_at >= thirty_days_ago,
            )
            act_res = await db.execute(act_query)
            act_count = act_res.scalar() or 0

            # Compute raw score components
            doc_score = doc_count * 10.0
            contrib_score = contrib_count * 15.0
            activity_score = act_count * 5.0
            raw_score = doc_score + contrib_score + activity_score

            if raw_score > max_raw_score:
                max_raw_score = raw_score

            # Collect topics from their documents
            topics_set = set()
            docs_query = select(Document).where(Document.owner_id == user.id)
            docs_res = await db.execute(docs_query)
            user_docs = docs_res.scalars().all()
            for doc in user_docs:
                meta = doc.metadata_ or {}
                doc_topics = meta.get("topics", [])
                for topic in doc_topics:
                    topics_set.add(str(topic).lower().strip())

            raw_scores[user.id] = {
                "raw_score": raw_score,
                "doc_count": doc_count,
                "contrib_count": contrib_count,
                "activity_score": activity_score,
                "topics": list(topics_set)[:8],
            }

        # 2. Normalize and update experts table
        for user_id, data in raw_scores.items():
            raw = data["raw_score"]
            norm_score = (raw / max_raw_score) * 100.0 if max_raw_score > 0 else 0.0

            # Check if expert row already exists
            expert_query = select(Expert).where(Expert.user_id == user_id)
            expert_res = await db.execute(expert_query)
            expert = expert_res.scalar_one_or_none()

            if expert:
                expert.expertise_score = norm_score
                expert.document_count = data["doc_count"]
                expert.contribution_count = data["contrib_count"]
                expert.activity_score = data["activity_score"]
                expert.topics = data["topics"]
                expert.last_calculated = datetime.now(timezone.utc)
                db.add(expert)
            else:
                new_expert = Expert(
                    user_id=user_id,
                    topics=data["topics"],
                    expertise_score=norm_score,
                    document_count=data["doc_count"],
                    contribution_count=data["contrib_count"],
                    activity_score=data["activity_score"],
                    last_calculated=datetime.now(timezone.utc),
                )
                db.add(new_expert)

        await db.commit()

    @staticmethod
    async def list_experts_by_topic(db: AsyncSession, topic: str) -> List[Expert]:
        """Fetch all expert profiles matching a specific topic, sorted by score descending."""
        topic_lower = topic.lower().strip()
        # Using ARRAY overlap/containment operator in Postgres
        stmt = (
            select(Expert)
            .where(Expert.topics.contains([topic_lower]))
            .order_by(desc(Expert.expertise_score))
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def get_expert_by_user_id(db: AsyncSession, user_id: UUID) -> Optional[Expert]:
        """Retrieve the expert profile of a user."""
        stmt = select(Expert).where(Expert.user_id == user_id)
        res = await db.execute(stmt)
        return res.scalar_one_or_none()

    @staticmethod
    async def list_top_experts(db: AsyncSession, limit: int = 10) -> List[Expert]:
        """List top experts sorted by expertise score."""
        stmt = select(Expert).order_by(desc(Expert.expertise_score)).limit(limit)
        res = await db.execute(stmt)
        return list(res.scalars().all())
