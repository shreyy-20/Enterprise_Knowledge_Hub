"""
Expert profile model for subject-matter expert identification.
"""

import uuid

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import String

from app.core.database import Base


class Expert(Base):
    """Calculated expert profile derived from user contributions."""

    __tablename__ = "experts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    topics = Column(ARRAY(String), default=list, nullable=False)
    expertise_score = Column(Float, default=0.0, nullable=False)
    document_count = Column(Integer, default=0, nullable=False)
    contribution_count = Column(Integer, default=0, nullable=False)
    activity_score = Column(Float, default=0.0, nullable=False)
    last_calculated = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    user = relationship("User", back_populates="expert_profile", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Expert user_id={self.user_id} score={self.expertise_score}>"
