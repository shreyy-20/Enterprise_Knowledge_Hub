"""
Notification Service.
Handles creating user notifications and updating their read/unread status.
"""

from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.models.notification import Notification


class NotificationService:
    """Service to manage user notifications."""

    @staticmethod
    async def create_notification(
        db: AsyncSession,
        user_id: UUID,
        title: str,
        message: str,
        notification_type: str = "info",
    ) -> Notification:
        """Create and persist a new notification for a specific user."""
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            is_read=False,
        )
        db.add(notification)
        await db.commit()
        await db.refresh(notification)
        return notification

    @staticmethod
    async def mark_read(db: AsyncSession, notification_id: UUID, user_id: UUID) -> Optional[Notification]:
        """Mark a notification as read if it belongs to the specified user."""
        stmt = select(Notification).where(
            Notification.id == notification_id, Notification.user_id == user_id
        )
        res = await db.execute(stmt)
        notification = res.scalar_one_or_none()

        if notification:
            notification.is_read = True
            db.add(notification)
            await db.commit()
            await db.refresh(notification)

        return notification

    @staticmethod
    async def mark_all_read(db: AsyncSession, user_id: UUID) -> None:
        """Mark all unread notifications for a user as read."""
        stmt = select(Notification).where(
            Notification.user_id == user_id, Notification.is_read == False
        )
        res = await db.execute(stmt)
        notifications = res.scalars().all()

        for notif in notifications:
            notif.is_read = True
            db.add(notif)
        await db.commit()

    @staticmethod
    async def get_unread_notifications(db: AsyncSession, user_id: UUID) -> List[Notification]:
        """Fetch all unread notifications for a user."""
        stmt = (
            select(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .order_by(Notification.created_at.desc())
        )
        res = await db.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def list_notifications(
        db: AsyncSession,
        user_id: UUID,
        page: int = 1,
        size: int = 10,
    ) -> tuple[List[Notification], int, int]:
        """Fetch a paginated list of notifications for a user, along with unread counts."""
        # 1. Total matching notifications
        count_stmt = select(func.count(Notification.id)).where(Notification.user_id == user_id)
        count_res = await db.execute(count_stmt)
        total = count_res.scalar() or 0

        # 2. Unread count
        unread_stmt = select(func.count(Notification.id)).where(
            Notification.user_id == user_id, Notification.is_read == False
        )
        unread_res = await db.execute(unread_stmt)
        unread_count = unread_res.scalar() or 0

        # 3. Paginated list
        offset = (page - 1) * size
        list_stmt = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(size)
        )
        list_res = await db.execute(list_stmt)
        items = list_res.scalars().all()

        return list(items), total, unread_count
