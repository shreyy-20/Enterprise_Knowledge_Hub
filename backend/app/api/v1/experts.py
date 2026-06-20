"""
Experts API Router.
Exposes subject-matter experts by topic and overall rankings.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.services.expert_service import ExpertService

router = APIRouter()


@router.get("/")
async def list_experts(
    topic: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve experts matching a specific topic, sorted by expertise score."""
    if topic:
        experts = await ExpertService.list_experts_by_topic(db=db, topic=topic)
    else:
        experts = await ExpertService.list_top_experts(db=db, limit=20)

    items = []
    for expert in experts:
        name = expert.user.full_name or expert.user.username if expert.user else "Unknown Expert"
        items.append({
            "id": expert.id,
            "user_id": expert.user_id,
            "username": expert.user.username if expert.user else None,
            "full_name": name,
            "topics": expert.topics,
            "expertise_score": expert.expertise_score,
            "document_count": expert.document_count,
            "contribution_count": expert.contribution_count,
            "activity_score": expert.activity_score,
            "last_calculated": expert.last_calculated,
        })
    return items


@router.get("/top")
async def get_top_experts(
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve top experts sorted by overall score."""
    experts = await ExpertService.list_top_experts(db=db, limit=limit)
    items = []
    for expert in experts:
        name = expert.user.full_name or expert.user.username if expert.user else "Unknown Expert"
        items.append({
            "id": expert.id,
            "user_id": expert.user_id,
            "username": expert.user.username if expert.user else None,
            "full_name": name,
            "topics": expert.topics,
            "expertise_score": expert.expertise_score,
            "document_count": expert.document_count,
            "contribution_count": expert.contribution_count,
            "activity_score": expert.activity_score,
        })
    return items


@router.get("/me")
async def get_my_expert_profile(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve current user's computed expert profile details."""
    expert = await ExpertService.get_expert_by_user_id(db=db, user_id=current_user.id)
    if not expert:
        raise HTTPException(status_code=404, detail="Expert profile not calculated yet.")
    return {
        "id": expert.id,
        "topics": expert.topics,
        "expertise_score": expert.expertise_score,
        "document_count": expert.document_count,
        "contribution_count": expert.contribution_count,
        "activity_score": expert.activity_score,
    }
