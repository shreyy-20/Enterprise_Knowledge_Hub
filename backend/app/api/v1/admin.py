"""
Admin API Router.
Handles role management, audit logs, global re-indexing, and expert scoring triggers.
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.api.deps import get_db, get_current_admin_user
from app.models.user import User, Role
from app.models.audit import AuditLog
from app.models.document import Document, DocumentStatus
from app.services.expert_service import ExpertService
from app.core.kafka import kafka_producer, Topics

router = APIRouter()


@router.post("/roles", status_code=status.HTTP_201_CREATED)
async def create_role(
    name: str,
    description: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Create a new security role (Admin only)."""
    # Check if role exists
    stmt = select(Role).where(Role.name == name)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Role already exists")

    role = Role(name=name, description=description)
    db.add(role)

    # Log action
    audit = AuditLog(
        user_id=current_admin.id,
        action="create_role",
        resource_type="role",
        details={"role_name": name},
    )
    db.add(audit)

    await db.commit()
    return {"message": f"Role '{name}' created successfully"}


@router.post("/roles/assign")
async def assign_role_to_user(
    user_id: UUID,
    role_name: str,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Assign a role to a user (Admin only)."""
    # Get user
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get role
    stmt = select(Role).where(Role.name == role_name)
    res = await db.execute(stmt)
    role = res.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=404, detail=f"Role '{role_name}' not found")

    # Check if already assigned
    if role in user.roles:
        return {"message": f"Role '{role_name}' already assigned to user"}

    user.roles.append(role)
    db.add(user)

    # Log action
    audit = AuditLog(
        user_id=current_admin.id,
        action="assign_role",
        resource_type="user",
        resource_id=user.id,
        details={"role_name": role_name},
    )
    db.add(audit)

    await db.commit()
    return {"message": f"Role '{role_name}' assigned to user '{user.username}' successfully"}


@router.get("/audit-logs")
async def get_audit_logs(
    page: int = 1,
    size: int = 20,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Retrieve system audit logs (Admin only)."""
    query = select(AuditLog)
    
    # Count total
    count_stmt = select(func.count(AuditLog.id))
    count_res = await db.execute(count_stmt)
    total = count_res.scalar() or 0

    # Paginate
    offset = (page - 1) * size
    query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(size)
    res = await db.execute(query)
    logs = res.scalars().all()

    items = [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "ip_address": log.ip_address,
            "user_agent": log.user_agent,
            "created_at": log.created_at,
        }
        for log in logs
    ]

    return {"items": items, "total": total, "page": page, "size": size}


@router.post("/reindex")
async def trigger_global_reindex(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Reset status and queue all existing documents for text re-extraction and re-embedding (Admin only)."""
    stmt = select(Document)
    res = await db.execute(stmt)
    docs = res.scalars().all()

    triggered_count = 0
    for doc in docs:
        doc.status = DocumentStatus.PENDING
        db.add(doc)
        
        # Publish ingestion request to Kafka
        try:
            await kafka_producer.send_message(
                topic=Topics.DOCUMENT_INGESTION,
                value={"document_id": str(doc.id)},
                key=str(doc.id),
            )
            triggered_count += 1
        except Exception:
            pass

    # Log action
    audit = AuditLog(
        user_id=current_admin.id,
        action="global_reindex",
        resource_type="system",
        details={"triggered_count": triggered_count},
    )
    db.add(audit)

    await db.commit()
    return {"message": f"Global reindex triggered for {triggered_count} documents."}


@router.post("/experts/recalculate")
async def trigger_expert_recalculation(
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    """Trigger immediate calculation of subject-matter expert profiles and normalization scores (Admin only)."""
    await ExpertService.calculate_expert_profiles(db=db)

    # Log action
    audit = AuditLog(
        user_id=current_admin.id,
        action="recalculate_experts",
        resource_type="system",
    )
    db.add(audit)
    await db.commit()

    return {"message": "Expert profiles recalculation completed successfully."}
