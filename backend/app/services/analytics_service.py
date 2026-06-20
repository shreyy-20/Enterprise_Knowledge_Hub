"""
Analytics Service.
Handles logging analytics events and aggregating statistics for the dashboard.
"""

from typing import List, Dict, Any, Optional
from uuid import UUID
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, Date, desc

from app.models.analytics import AnalyticsEvent
from app.models.document import Document
from app.models.expert import Expert
from app.models.user import User
from app.schemas.analytics import TimeSeriesData, TopItem, DashboardResponse


class AnalyticsService:
    """Service to track usage events and generate system metrics."""

    @staticmethod
    async def log_event(
        db: AsyncSession,
        user_id: Optional[UUID],
        event_type: str,
        metadata: Dict[str, Any],
    ) -> AnalyticsEvent:
        """Create and store an analytics event in the database."""
        event = AnalyticsEvent(
            event_type=event_type,
            user_id=user_id,
            metadata_=metadata,
        )
        db.add(event)
        await db.commit()
        await db.refresh(event)
        return event

    @staticmethod
    async def get_dashboard_stats(db: AsyncSession) -> DashboardResponse:
        """Aggregate system metrics and time-series history for the administrative dashboard."""
        # 1. Total Documents count
        doc_count_res = await db.execute(select(func.count(Document.id)))
        total_documents = doc_count_res.scalar() or 0

        # 2. Total Searches count
        search_count_res = await db.execute(
            select(func.count(AnalyticsEvent.id)).where(AnalyticsEvent.event_type == "search")
        )
        total_searches = search_count_res.scalar() or 0

        # 3. Active Users count (distinct user_ids that logged events)
        active_users_res = await db.execute(
            select(func.count(func.distinct(AnalyticsEvent.user_id))).where(AnalyticsEvent.user_id.isnot(None))
        )
        active_users = active_users_res.scalar() or 0

        # 4. Total Experts count
        expert_count_res = await db.execute(select(func.count(Expert.id)))
        total_experts = expert_count_res.scalar() or 0

        # 5. Search Usage (grouped by day)
        search_usage_stmt = (
            select(
                func.cast(AnalyticsEvent.created_at, Date).label("day"),
                func.count(AnalyticsEvent.id).label("count"),
            )
            .where(AnalyticsEvent.event_type == "search")
            .group_by(func.cast(AnalyticsEvent.created_at, Date))
            .order_by("day")
            .limit(30)
        )
        search_usage_res = await db.execute(search_usage_stmt)
        search_usage = [
            TimeSeriesData(date=str(row[0]), value=row[1]) for row in search_usage_res.all() if row[0] is not None
        ]

        # 6. Knowledge Growth (grouped by day)
        growth_stmt = (
            select(
                func.cast(Document.created_at, Date).label("day"),
                func.count(Document.id).label("count"),
            )
            .group_by(func.cast(Document.created_at, Date))
            .order_by("day")
            .limit(30)
        )
        growth_res = await db.execute(growth_stmt)
        knowledge_growth = [
            TimeSeriesData(date=str(row[0]), value=row[1]) for row in growth_res.all() if row[0] is not None
        ]

        # 7. User Activity (all events grouped by day)
        activity_stmt = (
            select(
                func.cast(AnalyticsEvent.created_at, Date).label("day"),
                func.count(AnalyticsEvent.id).label("count"),
            )
            .group_by(func.cast(AnalyticsEvent.created_at, Date))
            .order_by("day")
            .limit(30)
        )
        activity_res = await db.execute(activity_stmt)
        user_activity = [
            TimeSeriesData(date=str(row[0]), value=row[1]) for row in activity_res.all() if row[0] is not None
        ]

        # 8. Top Documents (by views)
        # Fetch views
        views_stmt = (
            select(AnalyticsEvent.metadata_)
            .where(AnalyticsEvent.event_type == "document_view")
            .limit(500)
        )
        views_res = await db.execute(views_stmt)
        doc_views = {}  # type: Dict[str, int]
        for row in views_res.scalars():
            if isinstance(row, dict) and "document_id" in row:
                doc_id = str(row["document_id"])
                doc_views[doc_id] = doc_views.get(doc_id, 0) + 1

        top_docs_list = []
        if doc_views:
            sorted_docs = sorted(doc_views.items(), key=lambda x: x[1], reverse=True)[:5]
            for doc_id, count in sorted_docs:
                try:
                    uuid_id = UUID(doc_id)
                    doc_obj = await db.get(Document, uuid_id)
                    if doc_obj:
                        top_docs_list.append(
                            TopItem(id=doc_id, name=doc_obj.title, value=count, category="document")
                        )
                except Exception:
                    pass

        # 9. Top Experts
        experts_stmt = (
            select(Expert)
            .join(User, Expert.user_id == User.id)
            .order_by(desc(Expert.expertise_score))
            .limit(5)
        )
        experts_res = await db.execute(experts_stmt)
        top_experts_list = []
        for expert in experts_res.scalars().all():
            name = expert.user.full_name or expert.user.username if expert.user else "Unknown Expert"
            top_experts_list.append(
                TopItem(
                    id=str(expert.id),
                    name=name,
                    value=int(expert.expertise_score),
                    category="expert",
                )
            )

        return DashboardResponse(
            total_documents=total_documents,
            total_searches=total_searches,
            active_users=active_users,
            total_experts=total_experts,
            search_usage=search_usage,
            knowledge_growth=knowledge_growth,
            user_activity=user_activity,
            top_documents=top_docs_list,
            top_experts=top_experts_list,
        )
