"""
Projects API Router.
Handles project CRUD operations and membership administration.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
    ProjectMemberAdd,
)
from app.services.knowledge_service import KnowledgeService

router = APIRouter()


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    proj_create: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new project workspace."""
    project = await KnowledgeService.create_project(db=db, proj_create=proj_create)
    return ProjectResponse.model_validate(project)


@router.get("/", response_model=ProjectListResponse)
async def list_projects(
    department_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all projects, optionally filtered by department."""
    projects = await KnowledgeService.list_projects(db=db, department_id=department_id)
    response_items = [ProjectResponse.model_validate(p) for p in projects]
    return ProjectListResponse(items=response_items, total=len(response_items))


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details of a project workspace by its UUID."""
    project = await KnowledgeService.get_project(db=db, proj_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectResponse.model_validate(project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    proj_update: ProjectUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update details of a project workspace."""
    project = await KnowledgeService.get_project(db=db, proj_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    updated_proj = await KnowledgeService.update_project(
        db=db, project=project, proj_update=proj_update
    )
    return ProjectResponse.model_validate(updated_proj)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a project workspace."""
    project = await KnowledgeService.get_project(db=db, proj_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Access control: Admin or Superuser
    is_admin = any(role.name.lower() == "admin" for role in current_user.roles)
    if not current_user.is_superuser and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can delete project workspaces",
        )

    await KnowledgeService.delete_project(db=db, project=project)


@router.post("/{project_id}/members", status_code=status.HTTP_201_CREATED)
async def add_project_member(
    project_id: UUID,
    member_data: ProjectMemberAdd,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Add or update user membership in a project workspace."""
    project = await KnowledgeService.get_project(db=db, proj_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project workspace not found")

    member = await KnowledgeService.add_project_member(
        db=db,
        project_id=project_id,
        user_id=member_data.user_id,
        role=member_data.role,
    )
    return {
        "project_id": member.project_id,
        "user_id": member.user_id,
        "role": member.role,
        "joined_at": member.joined_at,
    }


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_project_member(
    project_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove user membership from a project workspace."""
    project = await KnowledgeService.get_project(db=db, proj_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project workspace not found")

    await KnowledgeService.remove_project_member(db=db, project_id=project_id, user_id=user_id)
