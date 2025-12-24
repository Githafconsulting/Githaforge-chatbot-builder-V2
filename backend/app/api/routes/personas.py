"""
Personas API routes for company users.

Architecture:
- System personas: Global defaults (read-only for companies)
- Company personas: Custom personas created by companies (full CRUD)
- Companies can clone system personas to create editable copies
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.models.persona import (
    Persona,
    PersonaCreate,
    PersonaUpdate,
    PersonaRegenerateRequest,
    PersonaCloneRequest
)
from app.services.persona_service import get_persona_service, clear_persona_cache
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
# LIST PERSONAS (System + Company)
# ============================================================================

@router.get("/", response_model=List[Persona])
async def list_personas(
    include_system: bool = True,
    include_chatbot_count: bool = False,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("view_chatbots"))
):
    """
    List all personas available to the company.

    Returns:
    - System personas (global defaults, read-only) - if include_system=True
    - Company's custom personas (editable)

    System personas are marked with `is_system=True`.

    Query Parameters:
    - **include_system**: Include system personas (default: True)
    - **include_chatbot_count**: Include count of chatbots using each persona
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
        include_system=include_system,
        include_chatbot_count=include_chatbot_count
    )
    return personas


# ============================================================================
# GET SINGLE PERSONA
# ============================================================================

@router.get("/{persona_id}", response_model=Persona)
async def get_persona(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("view_chatbots"))
):
    """
    Get a persona by ID.

    Can retrieve:
    - System personas (read-only)
    - Company's own personas
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


# ============================================================================
# CREATE CUSTOM PERSONA
# ============================================================================

@router.post("/", response_model=Persona, status_code=status.HTTP_201_CREATED)
async def create_persona(
    persona_data: PersonaCreate,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Create a new custom persona for the company.

    - **name**: Persona name (e.g., "Technical Support", "Onboarding Assistant")
    - **description**: Description of the persona's purpose (used for LLM prompt generation)

    The system_prompt is automatically generated from the name and description using LLM.

    Note: To create a persona based on a system default, use the clone endpoint instead.
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
        persona = await service.create_company_persona(
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


# ============================================================================
# CLONE SYSTEM PERSONA
# ============================================================================

@router.post("/{persona_id}/clone", response_model=Persona, status_code=status.HTTP_201_CREATED)
async def clone_persona(
    persona_id: str,
    request: PersonaCloneRequest = None,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Clone a system persona to create an editable company copy.

    - **persona_id**: UUID of the system persona to clone
    - **new_name**: Optional custom name for the cloned persona (default: "{Original Name} (Custom)")

    This creates a copy of the system persona that the company can fully edit.
    The original system prompt is saved in `default_prompt` for reference.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = get_persona_service()

    # Verify it's a system persona
    persona = await service.get_persona(persona_id, str(company_id))
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona {persona_id} not found"
        )

    if not persona.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only system personas can be cloned. Use the create endpoint for custom personas."
        )

    try:
        new_name = request.new_name if request else None
        cloned_persona = await service.clone_system_persona(
            persona_id=persona_id,
            company_id=str(company_id),
            new_name=new_name
        )

        if not cloned_persona:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to clone persona"
            )

        return cloned_persona

    except Exception as e:
        if "duplicate key" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A persona with this name already exists. Please provide a different name."
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clone persona: {str(e)}"
        )


# ============================================================================
# UPDATE COMPANY PERSONA
# ============================================================================

@router.put("/{persona_id}", response_model=Persona)
async def update_persona(
    persona_id: str,
    persona_data: PersonaUpdate,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Update a company persona.

    - **name**: New name (optional)
    - **description**: New description (optional)
    - **system_prompt**: Direct prompt edit (optional) - previous prompt is saved to history

    **Note:** System personas cannot be edited. Clone them first to create an editable copy.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = get_persona_service()

    # Check if it's a system persona
    persona = await service.get_persona(persona_id, str(company_id))
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona {persona_id} not found"
        )

    if persona.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System personas cannot be edited. Clone it first to create an editable copy."
        )

    user_id = current_user.get("id")

    updated_persona = await service.update_company_persona(
        persona_id=persona_id,
        persona_data=persona_data,
        company_id=str(company_id),
        user_id=str(user_id) if user_id else None
    )

    if not updated_persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona {persona_id} not found"
        )

    return updated_persona


# ============================================================================
# DELETE COMPANY PERSONA
# ============================================================================

@router.delete("/{persona_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_persona(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("delete_chatbots"))
):
    """
    Delete a company persona.

    **Note:** System personas cannot be deleted.
    Chatbots using this persona will have their persona_id set to NULL.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = get_persona_service()

    # Check if it's a system persona
    persona = await service.get_persona(persona_id, str(company_id))
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona {persona_id} not found"
        )

    if persona.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System personas cannot be deleted"
        )

    success = await service.delete_company_persona(persona_id, str(company_id))

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete persona"
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
    Regenerate a company persona's system prompt using LLM.

    - **context**: Optional additional instructions for the regeneration

    The previous prompt is saved to history before regenerating.

    **Note:** System personas cannot be modified. Clone them first.
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

    if persona.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System personas cannot be modified. Clone it first to create an editable copy."
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
    updated_persona = await service.update_company_persona(
        persona_id=persona_id,
        persona_data=PersonaUpdate(system_prompt=new_prompt),
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
    Restore a cloned persona's system prompt to its original default value.

    Only works for personas that were cloned from system personas
    (have a `default_prompt` stored).
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = get_persona_service()

    # Check if it's a system persona
    persona = await service.get_persona(persona_id, str(company_id))
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona {persona_id} not found"
        )

    if persona.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System personas are already at their default state"
        )

    if not persona.default_prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This persona was not cloned from a system persona and has no default to restore"
        )

    restored_persona = await service.restore_to_default(persona_id, str(company_id))

    if not restored_persona:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to restore persona to default"
        )

    return restored_persona


@router.post("/{persona_id}/restore-last-saved", response_model=Persona)
async def restore_to_last_saved(
    persona_id: str,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Restore a company persona's system prompt to the last saved version.

    Restores from the prompt_history array.

    **Note:** System personas cannot be modified.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = get_persona_service()

    # Check if it's a system persona
    persona = await service.get_persona(persona_id, str(company_id))
    if not persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona {persona_id} not found"
        )

    if persona.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="System personas cannot be modified"
        )

    user_id = current_user.get("id")

    restored_persona = await service.restore_to_last_saved(
        persona_id=persona_id,
        company_id=str(company_id),
        user_id=str(user_id) if user_id else None
    )

    if not restored_persona:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Persona {persona_id} not found or has no history"
        )

    return restored_persona
