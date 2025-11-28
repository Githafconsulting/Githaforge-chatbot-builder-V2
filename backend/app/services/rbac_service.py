"""
RBAC (Role-Based Access Control) Service

Handles permission checking for multi-tenant authorization.
Works in conjunction with RLS for defense-in-depth security.

Permission Categories:
- documents: view_documents, upload_documents, delete_documents
- chatbots: view_chatbots, create_chatbots, edit_chatbots, delete_chatbots, deploy_chatbots
- analytics: view_analytics, export_data
- team: view_team, invite_members, edit_members, remove_members
- company: edit_company, manage_billing, manage_roles
"""
from typing import List, Optional, Set
from uuid import UUID
from app.core.database import get_supabase_client
from app.utils.logger import get_logger

logger = get_logger(__name__)


class RBACService:
    """Service for checking user permissions"""

    def __init__(self):
        self.db = get_supabase_client()
        self._permission_cache = {}  # Simple in-memory cache

    async def get_user_permissions(self, user_id: str) -> Set[str]:
        """
        Get all permission codes for a user

        Args:
            user_id: UUID of the user

        Returns:
            Set[str]: Set of permission codes (e.g., {"view_documents", "create_chatbots"})

        Example:
            permissions = await rbac.get_user_permissions(user_id)
            if "create_chatbots" in permissions:
                # User can create chatbots
        """
        # Check cache first (optional optimization)
        cache_key = f"user_perms:{user_id}"
        if cache_key in self._permission_cache:
            logger.debug(f"Permission cache hit for user {user_id}")
            return self._permission_cache[cache_key]

        try:
            # Get user's role_id
            user_response = self.db.table("users").select("role_id").eq("id", user_id).single().execute()

            if not user_response.data or not user_response.data.get("role_id"):
                logger.warning(f"User {user_id} has no role assigned")
                return set()

            role_id = user_response.data["role_id"]

            # Get all permissions for this role
            permissions_response = self.db.table("role_permissions") \
                .select("permissions(code)") \
                .eq("role_id", role_id) \
                .execute()

            if not permissions_response.data:
                logger.warning(f"No permissions found for role {role_id}")
                return set()

            # Extract permission codes
            permission_codes = set()
            for row in permissions_response.data:
                if row.get("permissions") and row["permissions"].get("code"):
                    permission_codes.add(row["permissions"]["code"])

            # Cache the result (5 minutes TTL in production)
            self._permission_cache[cache_key] = permission_codes

            logger.info(f"Loaded {len(permission_codes)} permissions for user {user_id}")
            return permission_codes

        except Exception as e:
            logger.error(f"Error fetching permissions for user {user_id}: {e}")
            return set()

    async def check_permission(self, user_id: str, permission_code: str) -> bool:
        """
        Check if user has a specific permission

        Args:
            user_id: UUID of the user
            permission_code: Permission code to check (e.g., "create_chatbots")

        Returns:
            bool: True if user has permission, False otherwise

        Example:
            if await rbac.check_permission(user_id, "delete_chatbots"):
                # User can delete chatbots
        """
        permissions = await self.get_user_permissions(user_id)
        has_permission = permission_code in permissions

        logger.debug(
            f"Permission check - User: {user_id}, "
            f"Permission: {permission_code}, "
            f"Result: {has_permission}"
        )

        return has_permission

    async def has_any_permission(self, user_id: str, permission_codes: List[str]) -> bool:
        """
        Check if user has ANY of the specified permissions

        Args:
            user_id: UUID of the user
            permission_codes: List of permission codes

        Returns:
            bool: True if user has at least one permission, False otherwise

        Example:
            if await rbac.has_any_permission(user_id, ["edit_chatbots", "deploy_chatbots"]):
                # User can either edit or deploy chatbots
        """
        permissions = await self.get_user_permissions(user_id)
        return any(code in permissions for code in permission_codes)

    async def has_all_permissions(self, user_id: str, permission_codes: List[str]) -> bool:
        """
        Check if user has ALL of the specified permissions

        Args:
            user_id: UUID of the user
            permission_codes: List of permission codes

        Returns:
            bool: True if user has all permissions, False otherwise

        Example:
            if await rbac.has_all_permissions(user_id, ["view_analytics", "export_data"]):
                # User can both view and export analytics
        """
        permissions = await self.get_user_permissions(user_id)
        return all(code in permissions for code in permission_codes)

    async def get_user_role(self, user_id: str) -> Optional[dict]:
        """
        Get user's role details

        Args:
            user_id: UUID of the user

        Returns:
            dict or None: Role information with permissions

        Example:
            role = await rbac.get_user_role(user_id)
            # {
            #   "id": "uuid",
            #   "code": "owner",
            #   "name": "Owner",
            #   "is_custom": False,
            #   "permissions": ["view_documents", "create_chatbots", ...]
            # }
        """
        try:
            # Get user's role
            user_response = self.db.table("users") \
                .select("role_id, roles(id, code, name, is_custom)") \
                .eq("id", user_id) \
                .single() \
                .execute()

            if not user_response.data or not user_response.data.get("roles"):
                return None

            role_data = user_response.data["roles"]

            # Get permissions for this role
            permissions = await self.get_user_permissions(user_id)

            return {
                "id": role_data["id"],
                "code": role_data["code"],
                "name": role_data["name"],
                "is_custom": role_data.get("is_custom", False),
                "permissions": list(permissions)
            }

        except Exception as e:
            logger.error(f"Error fetching role for user {user_id}: {e}")
            return None

    async def check_super_admin(self, user_id: str) -> bool:
        """
        Check if user is a super admin (Githaf platform admin)

        Args:
            user_id: UUID of the user

        Returns:
            bool: True if user is super admin

        Note:
            Super admins bypass all permission checks and RLS policies
        """
        try:
            response = self.db.table("users") \
                .select("role") \
                .eq("id", user_id) \
                .single() \
                .execute()

            if response.data:
                return response.data.get("role") == "super_admin"

            return False

        except Exception as e:
            logger.error(f"Error checking super admin status for user {user_id}: {e}")
            return False

    def clear_user_cache(self, user_id: str):
        """
        Clear cached permissions for a user

        Call this when user's role or permissions change

        Args:
            user_id: UUID of the user
        """
        cache_key = f"user_perms:{user_id}"
        if cache_key in self._permission_cache:
            del self._permission_cache[cache_key]
            logger.info(f"Cleared permission cache for user {user_id}")

    def clear_all_cache(self):
        """
        Clear entire permission cache

        Call this when roles or permissions are modified
        """
        self._permission_cache.clear()
        logger.info("Cleared all permission cache")


# Singleton instance
_rbac_service = None


def get_rbac_service() -> RBACService:
    """
    Get singleton RBAC service instance

    Returns:
        RBACService: RBAC service instance

    Example:
        rbac = get_rbac_service()
        has_perm = await rbac.check_permission(user_id, "create_chatbots")
    """
    global _rbac_service
    if _rbac_service is None:
        _rbac_service = RBACService()
    return _rbac_service
