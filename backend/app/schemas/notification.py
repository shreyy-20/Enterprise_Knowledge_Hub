"""
Notification Pydantic schemas.
"""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    """Notification item response."""
    id: UUID
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )


class NotificationListResponse(BaseModel):
    """Paginated list of notifications for a user."""
    items: list[NotificationResponse]
    total: int
    unread_count: int
