"""
Personas API routes for role-based chatbot prompt management.

Follows KISS, YAGNI, DRY, and SOLID principles.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.models.persona import (
    Persona,
    PersonaCreate,
    PersonaUpdate,
    PersonaRegenerateRequest,
    PersonaList
)
from app.services.persona_service import get_persona_service, PersonaService, clear_persona_cache
from app.services.persona_prompt_service import generate_persona_prompt, regenerate_persona_prompt
from app.core.dependencies import get_current_user, require_permission
from app.models.user import User
from app.core.database import get_supabase_client

router = APIRouter()


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def _get_company_name(company_id: str) -> str:
    """Get company name for prompt generation"""
    try:
        client = get_supabase_client()
        response = client.table("companies").select("name").eq("id", company_id).single().execute()
        return response.data.get("name", "Company") if response.data else "Company"
    except Exception:
        return "Company"


# ============================================================================
# PERSONA CRUD ENDPOINTS
# ============================================================================

@router.get("/", response_model=List[Persona])
async def list_personas(
    include_chatbot_count: bool = False,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("view_chatbots"))
):
    """
    List all personas for the current user's company.

    - **include_chatbot_count**: Include count of chatbots using each persona

    Returns personas ordered by: default personas first, then alphabetically by name.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = get_persona_service()
    personas = await service.list_company_personas(
        company_id=str(company_id),
        include_chatbot_count=include_chatbot_count
    )
    return personas


@router.post("/", response_model=Persona, status_code=status.HTTP_201_CREATED)
async def create_persona(
    persona_data: PersonaCreate,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Create a new persona for the company.

    - **name**: Persona name (e.g., "HR Support", "Technical Support")
    - **description**: Description of the persona's purpose (used for LLM prompt generation)

    The system_prompt is automatically generated from the name and description using LLM.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    # Get company name for prompt generation
    company_name = await _get_company_name(str(company_id))

    # Generate system prompt using LLM
    system_prompt = await generate_persona_prompt(
        persona_name=persona_data.name,
        persona_description=persona_data.description or persona_data.name,
        company_name=company_name
    )

    # Create the persona
    service = get_persona_service()
    try:
        persona = await service.create_persona(
            company_id=str(company_id),
            persona_data=persona_data,
            system_prompt=system_prompt
        )
        return persona
    except Exception as e:
        if "duplicate key" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A persona with name '{persona_data.name}' already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create persona: {str(e)}"
        )


@router.get("/{persona_id}", response_model=Persona)
async def get_persona(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("view_chatbots"))
):
    """
    Get a persona by ID.

    - **persona_id**: UUID of the persona
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = get_persona_service()
    persona = await service.get_persona(persona_id, str(company_id))

    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona {persona_id} not found"
        )

    return persona


@router.put("/{persona_id}", response_model=Persona)
async def update_persona(
    persona_id: str,
    persona_data: PersonaUpdate,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Update persona settings.

    - **persona_id**: UUID of the persona
    - **name**: New name (optional)
    - **description**: New description (optional)
    - **system_prompt**: Direct prompt edit (optional) - previous prompt is saved to history

    Note: Use the /regenerate endpoint to regenerate the prompt using LLM.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    user_id = current_user.get("id")

    service = get_persona_service()
    persona = await service.update_persona(
        persona_id=persona_id,
        persona_data=persona_data,
        company_id=str(company_id),
        user_id=str(user_id) if user_id else None
    )

    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona {persona_id} not found"
        )

    return persona


@router.delete("/{persona_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_persona(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("delete_chatbots"))
):
    """
    Delete a persona.

    - **persona_id**: UUID of the persona

    **Note:** Default personas cannot be deleted. Chatbots using this persona will
    have their persona_id set to NULL.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = get_persona_service()
    success = await service.delete_persona(persona_id, str(company_id))

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona {persona_id} not found or is a default persona (cannot be deleted)"
        )

    return None


# ============================================================================
# PROMPT MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/{persona_id}/regenerate", response_model=Persona)
async def regenerate_prompt(
    persona_id: str,
    request: PersonaRegenerateRequest,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Regenerate a persona's system prompt using LLM.

    - **persona_id**: UUID of the persona
    - **context**: Optional additional instructions for the regeneration

    The previous prompt is saved to history before regenerating.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = get_persona_service()
    persona = await service.get_persona(persona_id, str(company_id))

    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona {persona_id} not found"
        )

    # Get company name
    company_name = await _get_company_name(str(company_id))

    # Regenerate prompt
    new_prompt = await regenerate_persona_prompt(
        persona_name=persona.name,
        persona_description=persona.description or persona.name,
        company_name=company_name,
        current_prompt=persona.system_prompt,
        regenerate_context=request.context
    )

    # Update persona with new prompt (saves old to history)
    user_id = current_user.get("id")
    updated_persona = await service.update_persona(
        persona_id=persona_id,
        persona_data=PersonaUpdate(
            system_prompt=new_prompt,
            regenerate_context=request.context
        ),
        company_id=str(company_id),
        user_id=str(user_id) if user_id else None
    )

    return updated_persona


@router.post("/{persona_id}/restore-default", response_model=Persona)
async def restore_to_default(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Restore a persona's system prompt to its default value.

    - **persona_id**: UUID of the persona

    **Note:** Only works for default personas (is_default=True).
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = get_persona_service()
    persona = await service.restore_to_default(persona_id, str(company_id))

    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona {persona_id} not found or is not a default persona"
        )

    return persona


@router.post("/{persona_id}/restore-last-saved", response_model=Persona)
async def restore_to_last_saved(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Restore a persona's system prompt to the last saved version.

    - **persona_id**: UUID of the persona

    Restores from the prompt_history array.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    user_id = current_user.get("id")

    service = get_persona_service()
    persona = await service.restore_to_last_saved(
        persona_id=persona_id,
        company_id=str(company_id),
        user_id=str(user_id) if user_id else None
    )

    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona {persona_id} not found"
        )

    return persona


# ============================================================================
# SEED DEFAULTS ENDPOINT
# ============================================================================

@router.post("/seed-defaults", response_model=List[Persona])
async def seed_default_personas(
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Create default personas for the company.

    Creates the following default personas if they don't exist:
    - General
    - Sales
    - Support
    - HR
    - Product
    - Billing

    Existing personas with the same name are not overwritten.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = get_persona_service()
    success = await service.seed_defaults_for_company(str(company_id))

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to seed default personas"
        )

    # Clear cache and return updated list
    clear_persona_cache()
    personas = await service.list_company_personas(str(company_id))
    return personas
