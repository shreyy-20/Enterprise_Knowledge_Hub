"""
Notifications API Router.
Handles retrieving notifications and marking them as read.
"""

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.services.notification_service import NotificationService

router = APIRouter()


@router.get("/", response_model=NotificationListResponse)
async def list_user_notifications(
    page: int = 1,
    size: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all notifications for the currently logged-in user (paginated)."""
    items, total, unread_count = await NotificationService.list_notifications(
        db=db,
        user_id=current_user.id,
        page=page,
        size=size,
    )
    
    response_items = [NotificationResponse.model_validate(n) for n in items]
    return NotificationListResponse(
        items=response_items,
        total=total,
        unread_count=unread_count,
    )


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a specific notification as read."""
    notif = await NotificationService.mark_read(
        db=db,
        notification_id=notification_id,
        user_id=current_user.id,
    )
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    return NotificationResponse.model_validate(notif)


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all unread notifications for the current user as read."""
    await NotificationService.mark_all_read(db=db, user_id=current_user.id)
