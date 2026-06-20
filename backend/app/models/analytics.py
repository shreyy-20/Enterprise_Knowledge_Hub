"""
Analytics event model for tracking application usage.
"""

import uuid

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
)
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class AnalyticsEvent(Base):
    """A recorded analytics event (search, view, action, etc.)."""

    __tablename__ = "analytics_events"
    __table_args__ = (
        Index("ix_analytics_events_event_type", "event_type"),
        Index("ix_analytics_events_created_at", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(String(100), nullable=False)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    metadata_ = Column("metadata", JSON, nullable=True, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="analytics_events", lazy="selectin")

    def __repr__(self) -> str:
        return f"<AnalyticsEvent {self.event_type}>"
