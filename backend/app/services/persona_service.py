"""
Persona Service for managing role-based chatbot prompt configurations.

Architecture:
- System personas: company_id = NULL, is_system = TRUE (managed by super admin)
- Company personas: company_id = UUID, is_system = FALSE (managed by company users)
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
    PromptHistoryEntry,
    SystemPersonaUpdate
)
from app.utils.logger import get_logger

logger = get_logger(__name__)

# ============================================================================
# CACHE CONFIGURATION
# ============================================================================

CACHE_TTL_SECONDS = 300
_persona_cache: Dict[str, Tuple[Persona, float]] = {}
_system_personas_cache: Tuple[List[Persona], float] = ([], 0)


def clear_persona_cache(persona_id: Optional[str] = None):
    """Clear persona cache for a specific persona or all personas"""
    global _persona_cache, _system_personas_cache
    if persona_id:
        _persona_cache.pop(persona_id, None)
        logger.debug(f"Cleared cache for persona {persona_id}")
    else:
        _persona_cache = {}
        _system_personas_cache = ([], 0)
        logger.debug("Cleared all persona cache")


# ============================================================================
# PERSONA SERVICE CLASS
# ============================================================================

class PersonaService:
    """Service for CRUD operations on personas"""

    def __init__(self):
        self.client = get_supabase_client()

    # ========================================================================
    # SYSTEM PERSONAS (Super Admin Only)
    # ========================================================================

    async def list_system_personas(self) -> List[Persona]:
        """
        List all system personas (global defaults).
        Uses cache for performance.
        """
        global _system_personas_cache
        now = time.time()

        # Check cache
        cached_personas, cached_at = _system_personas_cache
        if cached_personas and (now - cached_at < CACHE_TTL_SECONDS):
            logger.debug("Cache hit for system personas")
            return cached_personas

        try:
            response = self.client.table("personas").select("*").eq(
                "is_system", True
            ).order("name").execute()

            personas = [Persona(**data) for data in response.data]

            # Update cache
            _system_personas_cache = (personas, now)

            return personas

        except Exception as e:
            logger.error(f"Error listing system personas: {str(e)}")
            return []

    async def get_system_persona(self, persona_id: str) -> Optional[Persona]:
        """Get a system persona by ID"""
        try:
            response = self.client.table("personas").select("*").eq(
                "id", persona_id
            ).eq("is_system", True).single().execute()

            if not response.data:
                return None

            return Persona(**response.data)

        except Exception as e:
            logger.error(f"Error fetching system persona: {str(e)}")
            return None

    async def create_system_persona(
        self,
        name: str,
        description: str,
        system_prompt: str
    ) -> Persona:
        """
        Create a new system persona (super admin only).
        """
        try:
            response = self.client.table("personas").insert({
                "company_id": None,
                "name": name,
                "description": description,
                "system_prompt": system_prompt,
                "is_default": True,
                "is_system": True,
                "default_prompt": None,
                "prompt_history": []
            }).execute()

            if not response.data:
                raise Exception("Failed to create system persona")

            # Clear cache
            clear_persona_cache()

            persona = Persona(**response.data[0])
            logger.info(f"Created system persona: {persona.id} ({persona.name})")
            return persona

        except Exception as e:
            logger.error(f"Error creating system persona: {str(e)}")
            raise

    async def update_system_persona(
        self,
        persona_id: str,
        update_data: SystemPersonaUpdate
    ) -> Optional[Persona]:
        """
        Update a system persona (super admin only).
        """
        try:
            update_dict = update_data.dict(exclude_unset=True)

            if not update_dict:
                return await self.get_system_persona(persona_id)

            response = self.client.table("personas").update(update_dict).eq(
                "id", persona_id
            ).eq("is_system", True).execute()

            if not response.data:
                return None

            # Clear cache
            clear_persona_cache()

            logger.info(f"Updated system persona: {persona_id}")
            return Persona(**response.data[0])

        except Exception as e:
            logger.error(f"Error updating system persona: {str(e)}")
            raise

    async def delete_system_persona(self, persona_id: str) -> bool:
        """
        Delete a system persona (super admin only).
        Warning: This affects all companies using this persona!
        """
        try:
            response = self.client.table("personas").delete().eq(
                "id", persona_id
            ).eq("is_system", True).execute()

            if not response.data:
                return False

            # Clear cache
            clear_persona_cache()

            logger.info(f"Deleted system persona: {persona_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting system persona: {str(e)}")
            return False

    # ========================================================================
    # COMPANY PERSONAS
    # ========================================================================

    async def list_company_personas(
        self,
        company_id: str,
        include_system: bool = True,
        include_chatbot_count: bool = False
    ) -> List[Persona]:
        """
        List personas available to a company.

        Returns:
        - System personas (global defaults, read-only) if include_system=True
        - Company's custom personas (editable)

        Ordered by: system personas first, then alphabetically by name.
        """
        try:
            personas = []

            # Get system personas first (if requested)
            if include_system:
                system_personas = await self.list_system_personas()
                personas.extend(system_personas)

            # Get company-specific personas
            response = self.client.table("personas").select("*").eq(
                "company_id", company_id
            ).eq("is_system", False).order("name").execute()

            company_personas = [Persona(**data) for data in response.data]
            personas.extend(company_personas)

            # Add chatbot counts if requested
            if include_chatbot_count and personas:
                chatbots_response = self.client.table("chatbots").select(
                    "persona_id"
                ).eq("company_id", company_id).not_.is_("persona_id", "null").execute()

                persona_counts: Dict[str, int] = {}
                for chatbot in chatbots_response.data:
                    pid = chatbot.get("persona_id")
                    if pid:
                        persona_counts[pid] = persona_counts.get(pid, 0) + 1

                for persona in personas:
                    persona.__dict__["chatbot_count"] = persona_counts.get(str(persona.id), 0)

            return personas

        except Exception as e:
            logger.error(f"Error listing company personas: {str(e)}")
            return []

    async def create_company_persona(
        self,
        company_id: str,
        persona_data: PersonaCreate,
        system_prompt: str
    ) -> Persona:
        """
        Create a new custom persona for a company.
        """
        try:
            response = self.client.table("personas").insert({
                "company_id": company_id,
                "name": persona_data.name,
                "description": persona_data.description,
                "system_prompt": system_prompt,
                "is_default": False,
                "is_system": False,
                "default_prompt": None,
                "prompt_history": []
            }).execute()

            if not response.data:
                raise Exception("Failed to create persona")

            persona = Persona(**response.data[0])
            logger.info(f"Created company persona: {persona.id} ({persona.name}) for company: {company_id}")
            return persona

        except Exception as e:
            logger.error(f"Error creating company persona: {str(e)}")
            raise

    async def get_persona(self, persona_id: str, company_id: Optional[str] = None) -> Optional[Persona]:
        """
        Get persona by ID.

        For company users: can access system personas OR their company's personas.
        For super admin: company_id=None allows access to any persona.
        """
        # Check cache first
        now = time.time()
        if persona_id in _persona_cache:
            persona, cached_at = _persona_cache[persona_id]
            if now - cached_at < CACHE_TTL_SECONDS:
                # Verify access
                if persona.is_system or (company_id and str(persona.company_id) == company_id) or company_id is None:
                    logger.debug(f"Cache hit for persona {persona_id}")
                    return persona
                return None

        try:
            response = self.client.table("personas").select("*").eq("id", persona_id).single().execute()

            if not response.data:
                return None

            persona = Persona(**response.data)

            # Verify access
            if not persona.is_system and company_id and str(persona.company_id) != company_id:
                return None

            # Cache the persona
            _persona_cache[persona_id] = (persona, now)

            return persona

        except Exception as e:
            logger.error(f"Error fetching persona: {str(e)}")
            return None

    async def update_company_persona(
        self,
        persona_id: str,
        persona_data: PersonaUpdate,
        company_id: str,
        user_id: Optional[str] = None
    ) -> Optional[Persona]:
        """
        Update a company persona (NOT system personas).

        If system_prompt is being updated, the previous prompt is saved to history.
        """
        try:
            # Get current persona and verify it's a company persona
            current_persona = await self.get_persona(persona_id, company_id)
            if not current_persona:
                return None

            # Cannot edit system personas
            if current_persona.is_system:
                logger.warning(f"Attempted to edit system persona: {persona_id}")
                return None

            update_dict = persona_data.dict(exclude_unset=True)

            if not update_dict:
                return current_persona

            # If updating system_prompt, save current to history
            if "system_prompt" in update_dict and update_dict["system_prompt"] != current_persona.system_prompt:
                history = list(current_persona.prompt_history)[-9:]
                history.append(PromptHistoryEntry(
                    prompt=current_persona.system_prompt,
                    saved_at=datetime.utcnow().isoformat(),
                    saved_by=user_id
                ))
                update_dict["prompt_history"] = [h.dict() for h in history]

            response = self.client.table("personas").update(update_dict).eq(
                "id", persona_id
            ).eq("company_id", company_id).eq("is_system", False).execute()

            if not response.data:
                return None

            # Clear cache
            clear_persona_cache(persona_id)

            logger.info(f"Updated company persona: {persona_id}")
            return Persona(**response.data[0])

        except Exception as e:
            logger.error(f"Error updating company persona: {str(e)}")
            raise

    async def delete_company_persona(self, persona_id: str, company_id: str) -> bool:
        """
        Delete a company persona (NOT system personas).
        """
        try:
            # Verify it's not a system persona
            persona = await self.get_persona(persona_id, company_id)
            if not persona or persona.is_system:
                logger.warning(f"Cannot delete system persona or persona not found: {persona_id}")
                return False

            response = self.client.table("personas").delete().eq(
                "id", persona_id
            ).eq("company_id", company_id).eq("is_system", False).execute()

            if not response.data:
                return False

            # Clear cache
            clear_persona_cache(persona_id)

            logger.info(f"Deleted company persona: {persona_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting company persona: {str(e)}")
            return False

    async def clone_system_persona(
        self,
        persona_id: str,
        company_id: str,
        new_name: Optional[str] = None
    ) -> Optional[Persona]:
        """
        Clone a system persona to create an editable company copy.
        """
        try:
            # Get the system persona
            system_persona = await self.get_system_persona(persona_id)
            if not system_persona:
                logger.warning(f"System persona not found for cloning: {persona_id}")
                return None

            # Generate name
            clone_name = new_name or f"{system_persona.name} (Custom)"

            # Create company persona as a copy
            response = self.client.table("personas").insert({
                "company_id": company_id,
                "name": clone_name,
                "description": system_persona.description,
                "system_prompt": system_persona.system_prompt,
                "is_default": False,
                "is_system": False,
                "default_prompt": system_persona.system_prompt,  # Store original for reference
                "prompt_history": []
            }).execute()

            if not response.data:
                raise Exception("Failed to clone persona")

            persona = Persona(**response.data[0])
            logger.info(f"Cloned system persona {persona_id} to company persona {persona.id}")
            return persona

        except Exception as e:
            logger.error(f"Error cloning system persona: {str(e)}")
            raise

    # ========================================================================
    # LEGACY METHODS (kept for backward compatibility during transition)
    # ========================================================================

    async def update_persona(
        self,
        persona_id: str,
        persona_data: PersonaUpdate,
        company_id: str,
        user_id: Optional[str] = None
    ) -> Optional[Persona]:
        """Legacy method - redirects to update_company_persona"""
        return await self.update_company_persona(persona_id, persona_data, company_id, user_id)

    async def delete_persona(self, persona_id: str, company_id: str) -> bool:
        """Legacy method - redirects to delete_company_persona"""
        return await self.delete_company_persona(persona_id, company_id)

    async def create_persona(
        self,
        company_id: str,
        persona_data: PersonaCreate,
        system_prompt: str
    ) -> Persona:
        """Legacy method - redirects to create_company_persona"""
        return await self.create_company_persona(company_id, persona_data, system_prompt)

    async def restore_to_last_saved(
        self,
        persona_id: str,
        company_id: str,
        user_id: Optional[str] = None
    ) -> Optional[Persona]:
        """
        Restore a company persona's system_prompt to the last saved version from history.
        Only works for company personas.
        """
        try:
            persona = await self.get_persona(persona_id, company_id)
            if not persona or persona.is_system:
                return None

            if not persona.prompt_history or len(persona.prompt_history) == 0:
                logger.warning(f"No prompt history for persona: {persona_id}")
                return persona

            last_entry = persona.prompt_history[-1]
            previous_prompt = last_entry.prompt
            new_history = persona.prompt_history[:-1]

            response = self.client.table("personas").update({
                "system_prompt": previous_prompt,
                "prompt_history": [h.dict() for h in new_history]
            }).eq("id", persona_id).eq("company_id", company_id).eq("is_system", False).execute()

            if not response.data:
                return None

            clear_persona_cache(persona_id)

            logger.info(f"Restored persona {persona_id} to last saved version")
            return Persona(**response.data[0])

        except Exception as e:
            logger.error(f"Error restoring persona to last saved: {str(e)}")
            return None

    async def restore_to_default(self, persona_id: str, company_id: str) -> Optional[Persona]:
        """
        Restore a cloned persona to its original default_prompt.
        Only works for company personas that were cloned from system personas.
        """
        try:
            persona = await self.get_persona(persona_id, company_id)
            if not persona or persona.is_system:
                return None

            if not persona.default_prompt:
                logger.warning(f"No default prompt available for persona: {persona_id}")
                return persona

            response = self.client.table("personas").update({
                "system_prompt": persona.default_prompt
            }).eq("id", persona_id).eq("company_id", company_id).eq("is_system", False).execute()

            if not response.data:
                return None

            clear_persona_cache(persona_id)

            logger.info(f"Restored persona {persona_id} to default prompt")
            return Persona(**response.data[0])

        except Exception as e:
            logger.error(f"Error restoring persona to default: {str(e)}")
            return None


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
