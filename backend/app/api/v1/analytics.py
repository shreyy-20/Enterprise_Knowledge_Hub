"""
Analytics API Router.
Exposes dashboard statistics and historical usage charts.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_admin_user
from app.schemas.analytics import DashboardResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter()


@router.get("/dashboard", response_model=DashboardResponse, dependencies=[Depends(get_current_admin_user)])
async def get_dashboard_data(
    db: AsyncSession = Depends(get_db),
):
    """Retrieve aggregate statistics and rankings for the main dashboard (Admin only)."""
    return await AnalyticsService.get_dashboard_stats(db=db)


@router.get("/usage", dependencies=[Depends(get_current_admin_user)])
async def get_usage_metrics(
    db: AsyncSession = Depends(get_db),
):
    """Retrieve historical time-series analytics for usage charts (Admin only)."""
    stats = await AnalyticsService.get_dashboard_stats(db=db)
    return {
        "search_usage": stats.search_usage,
        "knowledge_growth": stats.knowledge_growth,
        "user_activity": stats.user_activity,
    }
