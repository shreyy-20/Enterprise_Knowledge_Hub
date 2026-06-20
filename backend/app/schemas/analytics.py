"""
Analytics Pydantic schemas.
"""

from pydantic import BaseModel, Field


class AnalyticsEventCreate(BaseModel):
    """Analytics event creation payload."""
    event_type: str = Field(..., max_length=100)
    metadata: dict = Field(default_factory=dict)


class TimeSeriesData(BaseModel):
    """Single point in a time series chart."""
    date: str
    value: int


class TopItem(BaseModel):
    """Popular item ranking representation."""
    id: str
    name: str
    value: int
    category: str | None = None


class DashboardResponse(BaseModel):
    """System analytics dashboard aggregate data."""
    total_documents: int
    total_searches: int
    active_users: int
    total_experts: int
    search_usage: list[TimeSeriesData] = Field(default_factory=list)
    knowledge_growth: list[TimeSeriesData] = Field(default_factory=list)
    user_activity: list[TimeSeriesData] = Field(default_factory=list)
    top_documents: list[TopItem] = Field(default_factory=list)
    top_experts: list[TopItem] = Field(default_factory=list)
