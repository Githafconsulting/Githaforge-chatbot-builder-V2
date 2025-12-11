"""
Persona Service for managing role-based chatbot prompt configurations.

Follows KISS, YAGNI, DRY, and SOLID principles.
"""
from typing import List, Optional, Dict, Tuple
from datetime import datetime
import time
from uuid import UUID

from app.core.database import get_supabase_client
from app.models.persona import (
    Persona,
    PersonaCreate,
    PersonaUpdate,
    PromptHistoryEntry
)
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ============================================================================
# CACHE CONFIGURATION
# ============================================================================

# TTL cache for persona data (5 minutes)
CACHE_TTL_SECONDS = 300
_persona_cache: Dict[str, Tuple[Persona, float]] = {}


def clear_persona_cache(persona_id: Optional[str] = None):
    """Clear persona cache for a specific persona or all personas"""
    global _persona_cache
    if persona_id:
        _persona_cache.pop(persona_id, None)
        logger.debug(f"Cleared cache for persona {persona_id}")
    else:
        _persona_cache = {}
        logger.debug("Cleared all persona cache")


# ============================================================================
# PERSONA SERVICE CLASS
# ============================================================================

class PersonaService:
    """Service for CRUD operations on personas"""

    def __init__(self):
        self.client = get_supabase_client()

    async def create_persona(
        self,
        company_id: str,
        persona_data: PersonaCreate,
        system_prompt: str
    ) -> Persona:
        """
        Create a new persona for a company.

        Args:
            company_id: Company UUID
            persona_data: Persona creation data (name, description)
            system_prompt: LLM-generated system prompt

        Returns:
            Created Persona object
        """
        try:
            response = self.client.table("personas").insert({
                "company_id": company_id,
                "name": persona_data.name,
                "description": persona_data.description,
                "system_prompt": system_prompt,
                "is_default": False,  # User-created personas are not defaults
                "default_prompt": None,
                "prompt_history": []
            }).execute()

            if not response.data:
                raise Exception("Failed to create persona")

            persona = Persona(**response.data[0])
            logger.info(f"Created persona: {persona.id} ({persona.name}) for company: {company_id}")
            return persona

        except Exception as e:
            logger.error(f"Error creating persona: {str(e)}")
            raise

    async def get_persona(self, persona_id: str, company_id: Optional[str] = None) -> Optional[Persona]:
        """
        Get persona by ID with optional company verification.
        Uses TTL cache for performance.

        Args:
            persona_id: Persona UUID
            company_id: Optional company UUID for security verification

        Returns:
            Persona object or None if not found
        """
        # Check cache first
        now = time.time()
        if persona_id in _persona_cache:
            persona, cached_at = _persona_cache[persona_id]
            if now - cached_at < CACHE_TTL_SECONDS:
                # Verify company if provided
                if company_id and str(persona.company_id) != company_id:
                    return None
                logger.debug(f"Cache hit for persona {persona_id}")
                return persona

        try:
            query = self.client.table("personas").select("*").eq("id", persona_id)

            if company_id:
                query = query.eq("company_id", company_id)

            response = query.single().execute()

            if not response.data:
                return None

            persona = Persona(**response.data)

            # Cache the persona
            _persona_cache[persona_id] = (persona, now)
            logger.debug(f"Cached persona {persona_id}")

            return persona

        except Exception as e:
            logger.error(f"Error fetching persona: {str(e)}")
            return None

    async def list_company_personas(
        self,
        company_id: str,
        include_chatbot_count: bool = False
    ) -> List[Persona]:
        """
        List all personas for a company.

        Args:
            company_id: Company UUID
            include_chatbot_count: Whether to include count of chatbots using each persona

        Returns:
            List of Persona objects
        """
        try:
            response = self.client.table("personas").select("*").eq(
                "company_id", company_id
            ).order("is_default", desc=True).order("name").execute()

            personas = [Persona(**persona_data) for persona_data in response.data]

            if include_chatbot_count and personas:
                # Get all chatbot counts in a single query using aggregation
                # Fetch chatbots for this company and count per persona_id
                chatbots_response = self.client.table("chatbots").select(
                    "persona_id"
                ).eq("company_id", company_id).not_.is_("persona_id", "null").execute()

                # Count chatbots per persona_id in Python
                persona_counts: Dict[str, int] = {}
                for chatbot in chatbots_response.data:
                    pid = chatbot.get("persona_id")
                    if pid:
                        persona_counts[pid] = persona_counts.get(pid, 0) + 1

                # Attach counts to personas
                for persona in personas:
                    persona.__dict__["chatbot_count"] = persona_counts.get(str(persona.id), 0)

            return personas

        except Exception as e:
            logger.error(f"Error listing personas: {str(e)}")
            return []

    async def update_persona(
        self,
        persona_id: str,
        persona_data: PersonaUpdate,
        company_id: str,
        user_id: Optional[str] = None
    ) -> Optional[Persona]:
        """
        Update persona settings.

        If system_prompt is being updated, the previous prompt is saved to history.

        Args:
            persona_id: Persona UUID
            persona_data: Update data
            company_id: Company UUID for security verification
            user_id: Optional user ID for audit trail

        Returns:
            Updated Persona object or None if not found
        """
        try:
            # Get current persona for history
            current_persona = await self.get_persona(persona_id, company_id)
            if not current_persona:
                return None

            update_dict = persona_data.dict(exclude_unset=True)

            if not update_dict:
                return current_persona

            # If updating system_prompt, save current to history
            if "system_prompt" in update_dict and update_dict["system_prompt"] != current_persona.system_prompt:
                # Add current prompt to history (keep last 10)
                history = list(current_persona.prompt_history)[-9:]  # Keep last 9
                history.append(PromptHistoryEntry(
                    prompt=current_persona.system_prompt,
                    saved_at=datetime.utcnow().isoformat(),  # Convert to ISO string for JSON serialization
                    saved_by=user_id
                ))
                update_dict["prompt_history"] = [h.dict() for h in history]

            response = self.client.table("personas").update(update_dict).eq(
                "id", persona_id
            ).eq("company_id", company_id).execute()

            if not response.data:
                return None

            # Clear cache after update
            clear_persona_cache(persona_id)

            logger.info(f"Updated persona: {persona_id}")
            return Persona(**response.data[0])

        except Exception as e:
            logger.error(f"Error updating persona: {str(e)}")
            raise

    async def delete_persona(self, persona_id: str, company_id: str) -> bool:
        """
        Delete a persona (only non-default personas can be deleted).

        Chatbots using this persona will have persona_id set to NULL.

        Args:
            persona_id: Persona UUID
            company_id: Company UUID for security verification

        Returns:
            True if deleted, False if not found or is default
        """
        try:
            # Check if persona exists and is not default
            persona = await self.get_persona(persona_id, company_id)
            if not persona:
                return False

            if persona.is_default:
                logger.warning(f"Cannot delete default persona: {persona_id}")
                return False

            # Delete the persona (chatbots will have persona_id set to NULL via ON DELETE SET NULL)
            response = self.client.table("personas").delete().eq(
                "id", persona_id
            ).eq("company_id", company_id).execute()

            if not response.data:
                return False

            # Clear cache
            clear_persona_cache(persona_id)

            logger.info(f"Deleted persona: {persona_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting persona: {str(e)}")
            return False

    async def restore_to_default(self, persona_id: str, company_id: str) -> Optional[Persona]:
        """
        Restore a persona's system_prompt to its default value.

        Only works for default personas (is_default=True).
        For default personas, the default_prompt is the original system_prompt.

        Args:
            persona_id: Persona UUID
            company_id: Company UUID for security verification

        Returns:
            Updated Persona object or None if not found/not default
        """
        try:
            persona = await self.get_persona(persona_id, company_id)
            if not persona:
                return None

            if not persona.is_default:
                logger.warning(f"Cannot restore non-default persona to default: {persona_id}")
                return None

            # For default personas, default_prompt is NULL but we can re-seed
            # The seed function will recreate with original prompt
            # For now, we just keep current behavior - user can manually reset

            return persona

        except Exception as e:
            logger.error(f"Error restoring persona to default: {str(e)}")
            return None

    async def restore_to_last_saved(
        self,
        persona_id: str,
        company_id: str,
        user_id: Optional[str] = None
    ) -> Optional[Persona]:
        """
        Restore a persona's system_prompt to the last saved version from history.

        Args:
            persona_id: Persona UUID
            company_id: Company UUID for security verification
            user_id: Optional user ID for audit trail

        Returns:
            Updated Persona object or None if not found/no history
        """
        try:
            persona = await self.get_persona(persona_id, company_id)
            if not persona:
                return None

            if not persona.prompt_history or len(persona.prompt_history) == 0:
                logger.warning(f"No prompt history for persona: {persona_id}")
                return persona

            # Get the last saved prompt
            last_entry = persona.prompt_history[-1]
            previous_prompt = last_entry.prompt

            # Remove the last entry from history
            new_history = persona.prompt_history[:-1]

            # Update with restored prompt
            response = self.client.table("personas").update({
                "system_prompt": previous_prompt,
                "prompt_history": [h.dict() for h in new_history]
            }).eq("id", persona_id).eq("company_id", company_id).execute()

            if not response.data:
                return None

            # Clear cache
            clear_persona_cache(persona_id)

            logger.info(f"Restored persona {persona_id} to last saved version")
            return Persona(**response.data[0])

        except Exception as e:
            logger.error(f"Error restoring persona to last saved: {str(e)}")
            return None

    async def seed_defaults_for_company(self, company_id: str) -> bool:
        """
        Seed default personas for a company using the database function.

        Args:
            company_id: Company UUID

        Returns:
            True if successful
        """
        try:
            # Call the seed function via RPC
            self.client.rpc("seed_default_personas", {"p_company_id": company_id}).execute()
            logger.info(f"Seeded default personas for company: {company_id}")
            return True

        except Exception as e:
            logger.error(f"Error seeding default personas: {str(e)}")
            return False


# ============================================================================
# SINGLETON INSTANCE
# ============================================================================

_persona_service: Optional[PersonaService] = None


def get_persona_service() -> PersonaService:
    """Get singleton PersonaService instance"""
    global _persona_service
    if _persona_service is None:
        _persona_service = PersonaService()
    return _persona_service
