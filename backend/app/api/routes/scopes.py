"""
Scopes API routes for role-based chatbot prompt management.

Follows KISS, YAGNI, DRY, and SOLID principles.
Reference: docs/SCOPE_SYSTEM_IMPLEMENTATION_PLAN.md
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List

from app.models.scope import (
    Scope,
    ScopeCreate,
    ScopeUpdate,
    ScopeRegenerateRequest,
    ScopeList
)
from app.services.scope_service import get_scope_service, ScopeService, clear_scope_cache
from app.services.scope_prompt_service import generate_scope_prompt, regenerate_scope_prompt
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
# SCOPE CRUD ENDPOINTS
# ============================================================================

@router.get("/", response_model=List[Scope])
async def list_scopes(
    include_chatbot_count: bool = False,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("view_chatbots"))
):
    """
    List all scopes for the current user's company.

    - **include_chatbot_count**: Include count of chatbots using each scope

    Returns scopes ordered by: default scopes first, then alphabetically by name.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = get_scope_service()
    scopes = await service.list_company_scopes(
        company_id=str(company_id),
        include_chatbot_count=include_chatbot_count
    )
    return scopes


@router.post("/", response_model=Scope, status_code=status.HTTP_201_CREATED)
async def create_scope(
    scope_data: ScopeCreate,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Create a new scope for the company.

    - **name**: Scope name (e.g., "HR Support", "Technical Support")
    - **description**: Description of the scope's purpose (used for LLM prompt generation)

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
    system_prompt = await generate_scope_prompt(
        scope_name=scope_data.name,
        scope_description=scope_data.description or scope_data.name,
        company_name=company_name
    )

    # Create the scope
    service = get_scope_service()
    try:
        scope = await service.create_scope(
            company_id=str(company_id),
            scope_data=scope_data,
            system_prompt=system_prompt
        )
        return scope
    except Exception as e:
        if "duplicate key" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A scope with name '{scope_data.name}' already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create scope: {str(e)}"
        )


@router.get("/{scope_id}", response_model=Scope)
async def get_scope(
    scope_id: str,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("view_chatbots"))
):
    """
    Get a scope by ID.

    - **scope_id**: UUID of the scope
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = get_scope_service()
    scope = await service.get_scope(scope_id, str(company_id))

    if not scope:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scope {scope_id} not found"
        )

    return scope


@router.put("/{scope_id}", response_model=Scope)
async def update_scope(
    scope_id: str,
    scope_data: ScopeUpdate,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Update scope settings.

    - **scope_id**: UUID of the scope
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

    service = get_scope_service()
    scope = await service.update_scope(
        scope_id=scope_id,
        scope_data=scope_data,
        company_id=str(company_id),
        user_id=str(user_id) if user_id else None
    )

    if not scope:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scope {scope_id} not found"
        )

    return scope


@router.delete("/{scope_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scope(
    scope_id: str,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("delete_chatbots"))
):
    """
    Delete a scope.

    - **scope_id**: UUID of the scope

    **Note:** Default scopes cannot be deleted. Chatbots using this scope will
    have their scope_id set to NULL.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = get_scope_service()
    success = await service.delete_scope(scope_id, str(company_id))

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scope {scope_id} not found or is a default scope (cannot be deleted)"
        )

    return None


# ============================================================================
# PROMPT MANAGEMENT ENDPOINTS
# ============================================================================

@router.post("/{scope_id}/regenerate", response_model=Scope)
async def regenerate_prompt(
    scope_id: str,
    request: ScopeRegenerateRequest,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Regenerate a scope's system prompt using LLM.

    - **scope_id**: UUID of the scope
    - **context**: Optional additional instructions for the regeneration

    The previous prompt is saved to history before regenerating.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = get_scope_service()
    scope = await service.get_scope(scope_id, str(company_id))

    if not scope:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scope {scope_id} not found"
        )

    # Get company name
    company_name = await _get_company_name(str(company_id))

    # Regenerate prompt
    new_prompt = await regenerate_scope_prompt(
        scope_name=scope.name,
        scope_description=scope.description or scope.name,
        company_name=company_name,
        current_prompt=scope.system_prompt,
        regenerate_context=request.context
    )

    # Update scope with new prompt (saves old to history)
    user_id = current_user.get("id")
    updated_scope = await service.update_scope(
        scope_id=scope_id,
        scope_data=ScopeUpdate(
            system_prompt=new_prompt,
            regenerate_context=request.context
        ),
        company_id=str(company_id),
        user_id=str(user_id) if user_id else None
    )

    return updated_scope


@router.post("/{scope_id}/restore-default", response_model=Scope)
async def restore_to_default(
    scope_id: str,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Restore a scope's system prompt to its default value.

    - **scope_id**: UUID of the scope

    **Note:** Only works for default scopes (is_default=True).
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = get_scope_service()
    scope = await service.restore_to_default(scope_id, str(company_id))

    if not scope:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scope {scope_id} not found or is not a default scope"
        )

    return scope


@router.post("/{scope_id}/restore-last-saved", response_model=Scope)
async def restore_to_last_saved(
    scope_id: str,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Restore a scope's system prompt to the last saved version.

    - **scope_id**: UUID of the scope

    Restores from the prompt_history array.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    user_id = current_user.get("id")

    service = get_scope_service()
    scope = await service.restore_to_last_saved(
        scope_id=scope_id,
        company_id=str(company_id),
        user_id=str(user_id) if user_id else None
    )

    if not scope:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scope {scope_id} not found"
        )

    return scope


# ============================================================================
# SEED DEFAULTS ENDPOINT
# ============================================================================

@router.post("/seed-defaults", response_model=List[Scope])
async def seed_default_scopes(
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Create default scopes for the company.

    Creates the following default scopes if they don't exist:
    - General
    - Sales
    - Support
    - HR
    - Product
    - Billing

    Existing scopes with the same name are not overwritten.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = get_scope_service()
    success = await service.seed_defaults_for_company(str(company_id))

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to seed default scopes"
        )

    # Clear cache and return updated list
    clear_scope_cache()
    scopes = await service.list_company_scopes(str(company_id))
    return scopes
