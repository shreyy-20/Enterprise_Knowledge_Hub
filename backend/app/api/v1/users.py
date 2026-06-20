"""
Users API Router.
"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.api.deps import (
    get_db,
    get_current_active_user,
    get_current_admin_user,
)
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, UserListResponse

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve details of the currently authenticated user."""
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
async def update_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update details of the currently authenticated user."""
    if user_update.email is not None and user_update.email != current_user.email:
        # Check if email is already taken
        stmt = select(User).where(User.email == user_update.email)
        res = await db.execute(stmt)
        if res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already taken")
        current_user.email = user_update.email

    if user_update.username is not None and user_update.username != current_user.username:
        # Check if username is already taken
        stmt = select(User).where(User.username == user_update.username)
        res = await db.execute(stmt)
        if res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username already taken")
        current_user.username = user_update.username

    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url
    if user_update.department_id is not None:
        current_user.department_id = user_update.department_id

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.get("/", response_model=UserListResponse, dependencies=[Depends(get_current_admin_user)])
async def list_users(
    page: int = 1,
    size: int = 10,
    db: AsyncSession = Depends(get_db),
):
    """List all registered users (Admin only)."""
    query = select(User)
    
    # Count total records
    count_stmt = select(func.count(User.id))
    count_res = await db.execute(count_stmt)
    total = count_res.scalar() or 0

    # Retrieve paginated items
    offset = (page - 1) * size
    query = query.offset(offset).limit(size)
    res = await db.execute(query)
    users = res.scalars().all()

    items = [UserResponse.model_validate(u) for u in users]
    return UserListResponse(items=items, total=total, page=page, size=size)


@router.get("/{user_id}", response_model=UserResponse, dependencies=[Depends(get_current_admin_user)])
async def get_user_by_id(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details of a user by their UUID (Admin only)."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse, dependencies=[Depends(get_current_admin_user)])
async def update_user(
    user_id: UUID,
    user_update: UserUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update details of a user (Admin only)."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_update.email is not None and user_update.email != user.email:
        # Check if email is already taken
        stmt = select(User).where(User.email == user_update.email)
        res = await db.execute(stmt)
        if res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already taken")
        user.email = user_update.email

    if user_update.username is not None and user_update.username != user.username:
        # Check if username is already taken
        stmt = select(User).where(User.username == user_update.username)
        res = await db.execute(stmt)
        if res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Username already taken")
        user.username = user_update.username

    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.avatar_url is not None:
        user.avatar_url = user_update.avatar_url
    if user_update.department_id is not None:
        user.department_id = user_update.department_id
    if user_update.is_active is not None:
        user.is_active = user_update.is_active

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(get_current_admin_user)])
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a user account from the system (Admin only)."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
