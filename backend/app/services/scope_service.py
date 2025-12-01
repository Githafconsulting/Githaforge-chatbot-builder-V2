"""
Scope Service for managing role-based chatbot prompt configurations.

Follows KISS, YAGNI, DRY, and SOLID principles.
Reference: docs/SCOPE_SYSTEM_IMPLEMENTATION_PLAN.md
"""
from typing import List, Optional, Dict, Tuple
from datetime import datetime
import time
from uuid import UUID

from app.core.database import get_supabase_client
from app.models.scope import (
    Scope,
    ScopeCreate,
    ScopeUpdate,
    PromptHistoryEntry
)
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ============================================================================
# CACHE CONFIGURATION
# ============================================================================

# TTL cache for scope data (5 minutes)
CACHE_TTL_SECONDS = 300
_scope_cache: Dict[str, Tuple[Scope, float]] = {}


def clear_scope_cache(scope_id: Optional[str] = None):
    """Clear scope cache for a specific scope or all scopes"""
    global _scope_cache
    if scope_id:
        _scope_cache.pop(scope_id, None)
        logger.debug(f"Cleared cache for scope {scope_id}")
    else:
        _scope_cache = {}
        logger.debug("Cleared all scope cache")


# ============================================================================
# SCOPE SERVICE CLASS
# ============================================================================

class ScopeService:
    """Service for CRUD operations on scopes"""

    def __init__(self):
        self.client = get_supabase_client()

    async def create_scope(
        self,
        company_id: str,
        scope_data: ScopeCreate,
        system_prompt: str
    ) -> Scope:
        """
        Create a new scope for a company.

        Args:
            company_id: Company UUID
            scope_data: Scope creation data (name, description)
            system_prompt: LLM-generated system prompt

        Returns:
            Created Scope object
        """
        try:
            response = self.client.table("scopes").insert({
                "company_id": company_id,
                "name": scope_data.name,
                "description": scope_data.description,
                "system_prompt": system_prompt,
                "is_default": False,  # User-created scopes are not defaults
                "default_prompt": None,
                "prompt_history": []
            }).execute()

            if not response.data:
                raise Exception("Failed to create scope")

            scope = Scope(**response.data[0])
            logger.info(f"Created scope: {scope.id} ({scope.name}) for company: {company_id}")
            return scope

        except Exception as e:
            logger.error(f"Error creating scope: {str(e)}")
            raise

    async def get_scope(self, scope_id: str, company_id: Optional[str] = None) -> Optional[Scope]:
        """
        Get scope by ID with optional company verification.
        Uses TTL cache for performance.

        Args:
            scope_id: Scope UUID
            company_id: Optional company UUID for security verification

        Returns:
            Scope object or None if not found
        """
        # Check cache first
        now = time.time()
        if scope_id in _scope_cache:
            scope, cached_at = _scope_cache[scope_id]
            if now - cached_at < CACHE_TTL_SECONDS:
                # Verify company if provided
                if company_id and str(scope.company_id) != company_id:
                    return None
                logger.debug(f"Cache hit for scope {scope_id}")
                return scope

        try:
            query = self.client.table("scopes").select("*").eq("id", scope_id)

            if company_id:
                query = query.eq("company_id", company_id)

            response = query.single().execute()

            if not response.data:
                return None

            scope = Scope(**response.data)

            # Cache the scope
            _scope_cache[scope_id] = (scope, now)
            logger.debug(f"Cached scope {scope_id}")

            return scope

        except Exception as e:
            logger.error(f"Error fetching scope: {str(e)}")
            return None

    async def list_company_scopes(
        self,
        company_id: str,
        include_chatbot_count: bool = False
    ) -> List[Scope]:
        """
        List all scopes for a company.

        Args:
            company_id: Company UUID
            include_chatbot_count: Whether to include count of chatbots using each scope

        Returns:
            List of Scope objects
        """
        try:
            response = self.client.table("scopes").select("*").eq(
                "company_id", company_id
            ).order("is_default", desc=True).order("name").execute()

            scopes = [Scope(**scope_data) for scope_data in response.data]

            if include_chatbot_count:
                # Get chatbot counts for each scope
                for scope in scopes:
                    count_response = self.client.table("chatbots").select(
                        "id", count="exact"
                    ).eq("scope_id", str(scope.id)).execute()
                    # Attach count as attribute
                    scope.__dict__["chatbot_count"] = count_response.count or 0

            return scopes

        except Exception as e:
            logger.error(f"Error listing scopes: {str(e)}")
            return []

    async def update_scope(
        self,
        scope_id: str,
        scope_data: ScopeUpdate,
        company_id: str,
        user_id: Optional[str] = None
    ) -> Optional[Scope]:
        """
        Update scope settings.

        If system_prompt is being updated, the previous prompt is saved to history.

        Args:
            scope_id: Scope UUID
            scope_data: Update data
            company_id: Company UUID for security verification
            user_id: Optional user ID for audit trail

        Returns:
            Updated Scope object or None if not found
        """
        try:
            # Get current scope for history
            current_scope = await self.get_scope(scope_id, company_id)
            if not current_scope:
                return None

            update_dict = scope_data.dict(exclude_unset=True)

            if not update_dict:
                return current_scope

            # If updating system_prompt, save current to history
            if "system_prompt" in update_dict and update_dict["system_prompt"] != current_scope.system_prompt:
                # Add current prompt to history (keep last 10)
                history = list(current_scope.prompt_history)[-9:]  # Keep last 9
                history.append(PromptHistoryEntry(
                    prompt=current_scope.system_prompt,
                    saved_at=datetime.utcnow().isoformat(),  # Convert to ISO string for JSON serialization
                    saved_by=user_id
                ))
                update_dict["prompt_history"] = [h.dict() for h in history]

            response = self.client.table("scopes").update(update_dict).eq(
                "id", scope_id
            ).eq("company_id", company_id).execute()

            if not response.data:
                return None

            # Clear cache after update
            clear_scope_cache(scope_id)

            logger.info(f"Updated scope: {scope_id}")
            return Scope(**response.data[0])

        except Exception as e:
            logger.error(f"Error updating scope: {str(e)}")
            raise

    async def delete_scope(self, scope_id: str, company_id: str) -> bool:
        """
        Delete a scope (only non-default scopes can be deleted).

        Chatbots using this scope will have scope_id set to NULL.

        Args:
            scope_id: Scope UUID
            company_id: Company UUID for security verification

        Returns:
            True if deleted, False if not found or is default
        """
        try:
            # Check if scope exists and is not default
            scope = await self.get_scope(scope_id, company_id)
            if not scope:
                return False

            if scope.is_default:
                logger.warning(f"Cannot delete default scope: {scope_id}")
                return False

            # Delete the scope (chatbots will have scope_id set to NULL via ON DELETE SET NULL)
            response = self.client.table("scopes").delete().eq(
                "id", scope_id
            ).eq("company_id", company_id).execute()

            if not response.data:
                return False

            # Clear cache
            clear_scope_cache(scope_id)

            logger.info(f"Deleted scope: {scope_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting scope: {str(e)}")
            return False

    async def restore_to_default(self, scope_id: str, company_id: str) -> Optional[Scope]:
        """
        Restore a scope's system_prompt to its default value.

        Only works for default scopes (is_default=True).
        For default scopes, the default_prompt is the original system_prompt.

        Args:
            scope_id: Scope UUID
            company_id: Company UUID for security verification

        Returns:
            Updated Scope object or None if not found/not default
        """
        try:
            scope = await self.get_scope(scope_id, company_id)
            if not scope:
                return None

            if not scope.is_default:
                logger.warning(f"Cannot restore non-default scope to default: {scope_id}")
                return None

            # For default scopes, default_prompt is NULL but we can re-seed
            # The seed function will recreate with original prompt
            # For now, we just keep current behavior - user can manually reset

            return scope

        except Exception as e:
            logger.error(f"Error restoring scope to default: {str(e)}")
            return None

    async def restore_to_last_saved(
        self,
        scope_id: str,
        company_id: str,
        user_id: Optional[str] = None
    ) -> Optional[Scope]:
        """
        Restore a scope's system_prompt to the last saved version from history.

        Args:
            scope_id: Scope UUID
            company_id: Company UUID for security verification
            user_id: Optional user ID for audit trail

        Returns:
            Updated Scope object or None if not found/no history
        """
        try:
            scope = await self.get_scope(scope_id, company_id)
            if not scope:
                return None

            if not scope.prompt_history or len(scope.prompt_history) == 0:
                logger.warning(f"No prompt history for scope: {scope_id}")
                return scope

            # Get the last saved prompt
            last_entry = scope.prompt_history[-1]
            previous_prompt = last_entry.prompt

            # Remove the last entry from history
            new_history = scope.prompt_history[:-1]

            # Update with restored prompt
            response = self.client.table("scopes").update({
                "system_prompt": previous_prompt,
                "prompt_history": [h.dict() for h in new_history]
            }).eq("id", scope_id).eq("company_id", company_id).execute()

            if not response.data:
                return None

            # Clear cache
            clear_scope_cache(scope_id)

            logger.info(f"Restored scope {scope_id} to last saved version")
            return Scope(**response.data[0])

        except Exception as e:
            logger.error(f"Error restoring scope to last saved: {str(e)}")
            return None

    async def seed_defaults_for_company(self, company_id: str) -> bool:
        """
        Seed default scopes for a company using the database function.

        Args:
            company_id: Company UUID

        Returns:
            True if successful
        """
        try:
            # Call the seed function via RPC
            self.client.rpc("seed_default_scopes", {"p_company_id": company_id}).execute()
            logger.info(f"Seeded default scopes for company: {company_id}")
            return True

        except Exception as e:
            logger.error(f"Error seeding default scopes: {str(e)}")
            return False


# ============================================================================
# SINGLETON INSTANCE
# ============================================================================

_scope_service: Optional[ScopeService] = None


def get_scope_service() -> ScopeService:
    """Get singleton ScopeService instance"""
    global _scope_service
    if _scope_service is None:
        _scope_service = ScopeService()
    return _scope_service
