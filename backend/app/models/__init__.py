# backend/app/models/__init__.py
"""SQLAlchemy ORM models."""

from app.models.user import User, Role, Permission, UserRole, RolePermission
from app.models.document import Document, DocumentChunk, Embedding, KnowledgeSource
from app.models.project import Project, ProjectMember
from app.models.department import Department, Team, TeamMember
from app.models.expert import Expert
from app.models.analytics import AnalyticsEvent
from app.models.notification import Notification
from app.models.audit import AuditLog

__all__ = [
    "User", "Role", "Permission", "UserRole", "RolePermission",
    "Document", "DocumentChunk", "Embedding", "KnowledgeSource",
    "Project", "ProjectMember",
    "Department", "Team", "TeamMember",
    "Expert",
    "AnalyticsEvent",
    "Notification",
    "AuditLog",
]
