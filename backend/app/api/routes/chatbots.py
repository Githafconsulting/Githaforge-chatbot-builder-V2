"""
Chatbot CRUD API routes for multi-bot management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel
from app.models.chatbot import (
    ChatbotCreate,
    ChatbotUpdate,
    Chatbot,
    ChatbotWithEmbedCode,
    ChatbotDeploy,
    ChatbotStats
)
from app.services.chatbot_service import ChatbotService
from app.services.branding_service import clear_branding_cache
from app.core.dependencies import get_current_user, require_permission, require_any_permission
from app.models.user import User

router = APIRouter()


class ChatbotPublicStatus(BaseModel):
    """Public chatbot status for embed widget"""
    is_active: bool
    deploy_status: str


class ChatbotWidgetConfig(BaseModel):
    """
    Public widget configuration for embed script.
    This endpoint enables the Klaviyo-style simplified embed approach.
    """
    chatbot_id: str
    is_active: bool
    deploy_status: str
    paused_message: Optional[str] = None

    # Widget appearance
    primary_color: Optional[str] = "#1e40af"
    secondary_color: Optional[str] = "#0ea5e9"
    widget_theme: Optional[str] = "modern"
    widget_position: Optional[str] = "bottom-right"
    button_size: Optional[str] = "medium"
    show_notification_badge: Optional[bool] = True
    widget_title: Optional[str] = "Chat with us"
    widget_subtitle: Optional[str] = "We're here to help"
    greeting_message: Optional[str] = "Hi! How can I help you today?"
    padding_x: Optional[int] = 20
    padding_y: Optional[int] = 20
    z_index: Optional[int] = 9999
    logo_url: Optional[str] = None


@router.get("/{chatbot_id}/widget-config", response_model=ChatbotWidgetConfig)
async def get_widget_config(chatbot_id: str):
    """
    Get public widget configuration (no authentication required).

    This endpoint enables a simplified embed approach like Klaviyo:
    ```html
    <script src="https://yourdomain.com/widget/embed.js" data-chatbot-id="xxx"></script>
    ```

    The embed script fetches all configuration dynamically from this endpoint,
    so clients don't need to hardcode any settings or URLs.

    Changes made in the admin dashboard apply immediately without
    requiring clients to update their embed code.

    - **chatbot_id**: UUID of the chatbot

    Returns all widget configuration needed to render the chat widget.
    """
    try:
        from app.core.database import get_supabase_client
        client = get_supabase_client()

        response = client.table("chatbots").select(
            "id, is_active, deploy_status, paused_message, "
            "primary_color, secondary_color, widget_theme, widget_position, "
            "button_size, show_notification_badge, widget_title, widget_subtitle, "
            "greeting_message, padding_x, padding_y, z_index, logo_url"
        ).eq("id", chatbot_id).single().execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Chatbot {chatbot_id} not found"
            )

        data = response.data
        return ChatbotWidgetConfig(
            chatbot_id=data.get("id"),
            is_active=data.get("is_active", True),
            deploy_status=data.get("deploy_status", "draft"),
            paused_message=data.get("paused_message"),
            primary_color=data.get("primary_color") or "#1e40af",
            secondary_color=data.get("secondary_color") or "#0ea5e9",
            widget_theme=data.get("widget_theme") or "modern",
            widget_position=data.get("widget_position") or "bottom-right",
            button_size=data.get("button_size") or "medium",
            show_notification_badge=data.get("show_notification_badge", True),
            widget_title=data.get("widget_title") or "Chat with us",
            widget_subtitle=data.get("widget_subtitle") or "We're here to help",
            greeting_message=data.get("greeting_message") or "Hi! How can I help you today?",
            padding_x=data.get("padding_x") or 20,
            padding_y=data.get("padding_y") or 20,
            z_index=data.get("z_index") or 9999,
            logo_url=data.get("logo_url")
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch widget config: {str(e)}"
        )


@router.get("/{chatbot_id}/public", response_model=ChatbotPublicStatus)
async def get_chatbot_public_status(chatbot_id: str):
    """
    Get public chatbot status (no authentication required)

    This endpoint is used by the embed widget to check if a chatbot
    should be displayed on a website.

    - **chatbot_id**: UUID of the chatbot

    Returns:
    - **is_active**: Whether the chatbot is visible on websites
    - **deploy_status**: Current deployment status (deployed/paused/draft)
    """
    # Use direct database query to get minimal status info
    try:
        from app.core.database import get_supabase_client
        client = get_supabase_client()

        response = client.table("chatbots").select(
            "is_active, deploy_status"
        ).eq("id", chatbot_id).single().execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Chatbot {chatbot_id} not found"
            )

        return ChatbotPublicStatus(
            is_active=response.data.get("is_active", True),
            deploy_status=response.data.get("deploy_status", "draft")
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch chatbot status: {str(e)}"
        )


class PersonaAssignRequest(BaseModel):
    """Request to assign a persona to a chatbot"""
    persona_id: Optional[str] = None  # None to remove persona assignment


class KBModeRequest(BaseModel):
    """Request to set knowledge base mode for a chatbot"""
    use_shared_kb: bool
    selected_document_ids: Optional[List[str]] = None  # Required if use_shared_kb=False


@router.post("/", response_model=Chatbot, status_code=status.HTTP_201_CREATED)
async def create_chatbot(
    chatbot_data: ChatbotCreate,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("create_chatbots"))
):
    """
    Create a new chatbot for the company

    - **name**: Chatbot name (2-100 characters)
    - **description**: Optional description
    - **greeting_message**: First message shown to users
    - **primary_color**: Brand color (hex)
    - **secondary_color**: Accent color (hex)
    - **logo_url**: Optional logo
    - **model_preset**: fast/balanced/accurate
    - **temperature**: 0.0-1.0 (creativity)
    - **max_tokens**: Response length limit
    - **top_k**: Number of KB chunks to retrieve
    - **similarity_threshold**: Minimum relevance score
    - **allowed_domains**: Domains where bot can be embedded
    - **rate_limit_per_ip**: Max requests per minute per IP
    """
    # Extract company_id from authenticated user
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    # Override company_id from JWT (security: prevent users from creating bots for other companies)
    chatbot_data.company_id = str(company_id)

    # TODO: Check company plan limits (max_bots)
    # service = ChatbotService()
    # company_bots = await service.list_company_chatbots(company_id)
    # if len(company_bots) >= current_user.company.max_bots:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail=f"Plan limit reached: {current_user.company.max_bots} bots maximum"
    #     )

    try:
        service = ChatbotService()
        chatbot = await service.create_chatbot(chatbot_data, str(company_id))
        return chatbot
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create chatbot: {str(e)}"
        )


@router.get("/", response_model=List[Chatbot])
async def list_chatbots(
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("view_chatbots"))
):
    """
    List all chatbots for the current user's company

    - **limit**: Max number of results (default: 100)
    - **offset**: Pagination offset (default: 0)

    Returns only chatbots belonging to the user's company
    """
    # Extract company_id from authenticated user
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = ChatbotService()
    chatbots = await service.list_company_chatbots(
        company_id=str(company_id),
        limit=limit,
        offset=offset
    )
    return chatbots


@router.get("/{chatbot_id}", response_model=Chatbot)
async def get_chatbot(
    chatbot_id: str,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("view_chatbots"))
):
    """
    Get chatbot by ID

    - **chatbot_id**: UUID of the chatbot

    Returns chatbot configuration and metrics
    """
    # Extract company_id from authenticated user
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = ChatbotService()
    chatbot = await service.get_chatbot(chatbot_id, str(company_id))

    if not chatbot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chatbot {chatbot_id} not found"
        )

    return chatbot


@router.put("/{chatbot_id}", response_model=Chatbot)
async def update_chatbot(
    chatbot_id: str,
    chatbot_data: ChatbotUpdate,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Update chatbot settings

    - **chatbot_id**: UUID of the chatbot
    - **chatbot_data**: Fields to update (all optional)

    Allows updating all configuration settings:
    - Name, description, greeting
    - Brand colors, logo
    - Model configuration (preset, temperature, tokens)
    - RAG settings (top_k, similarity threshold)
    - Access control (domains, rate limits)
    """
    # Extract company_id from authenticated user
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = ChatbotService()
    chatbot = await service.update_chatbot(chatbot_id, chatbot_data, str(company_id))

    if not chatbot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chatbot {chatbot_id} not found"
        )

    # Clear branding cache so new settings take effect immediately
    clear_branding_cache(chatbot_id)

    return chatbot


@router.delete("/{chatbot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chatbot(
    chatbot_id: str,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("delete_chatbots"))
):
    """
    Soft delete a chatbot

    - **chatbot_id**: UUID of the chatbot

    Sets is_active=false instead of hard delete
    Preserves conversation history
    Widget will stop working immediately

    IMPORTANT: This action cannot be undone
    """
    # Extract company_id from authenticated user
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = ChatbotService()
    success = await service.delete_chatbot(chatbot_id, str(company_id))

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chatbot {chatbot_id} not found"
        )

    return None


@router.post("/{chatbot_id}/deploy", response_model=Chatbot)
async def deploy_chatbot(
    chatbot_id: str,
    deploy_data: ChatbotDeploy,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("deploy_chatbots"))
):
    """
    Deploy or pause a chatbot

    - **chatbot_id**: UUID of the chatbot
    - **deploy_status**: "deployed" or "paused"

    Deployed: Widget is live and accepting conversations
    Paused: Widget shows maintenance message

    Draft bots must be deployed before they can accept conversations
    """
    # Extract company_id from authenticated user
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = ChatbotService()
    chatbot = await service.deploy_chatbot(chatbot_id, deploy_data, str(company_id))

    if not chatbot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chatbot {chatbot_id} not found"
        )

    return chatbot


@router.get("/{chatbot_id}/stats", response_model=ChatbotStats)
async def get_chatbot_stats(
    chatbot_id: str,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("view_analytics"))
):
    """
    Get chatbot statistics

    - **chatbot_id**: UUID of the chatbot

    Returns:
    - Total conversations
    - Total messages
    - Average satisfaction score
    - Average response time
    - Satisfaction rate (% of rated messages)
    - Response rate (% of messages with feedback)
    - Top queries
    - Daily stats (last 30 days)
    """
    # Extract company_id from authenticated user
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = ChatbotService()

    # Verify chatbot exists and belongs to user's company
    chatbot = await service.get_chatbot(chatbot_id, str(company_id))
    if not chatbot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chatbot {chatbot_id} not found"
        )

    stats = await service.get_chatbot_stats(chatbot_id, str(company_id))
    return stats


@router.get("/{chatbot_id}/embed-code", response_model=ChatbotWithEmbedCode)
async def get_embed_code(
    chatbot_id: str,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("view_chatbots"))
):
    """
    Get chatbot with generated embed code

    - **chatbot_id**: UUID of the chatbot

    Returns chatbot details + JavaScript embed code
    Use this endpoint to display the embed code in the chatbot builder UI

    Embed code includes:
    - Chatbot ID and API URL
    - Brand colors and logo
    - Greeting message
    - Auto-initialization script
    """
    # Extract company_id from authenticated user
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    service = ChatbotService()
    chatbot_with_code = await service.get_chatbot_with_embed_code(chatbot_id, str(company_id))

    if not chatbot_with_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chatbot {chatbot_id} not found"
        )

    return chatbot_with_code


@router.put("/{chatbot_id}/persona", response_model=Chatbot)
async def assign_persona(
    chatbot_id: str,
    persona_request: PersonaAssignRequest,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Assign a persona to a chatbot

    - **chatbot_id**: UUID of the chatbot
    - **persona_id**: UUID of the persona to assign (null to remove)

    The persona determines the chatbot's system prompt behavior.
    Setting persona_id to null removes persona assignment (uses default prompt).
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    # Verify persona belongs to company if provided
    if persona_request.persona_id:
        from app.services.persona_service import get_persona_service
        persona_service = get_persona_service()
        persona = await persona_service.get_persona(persona_request.persona_id, str(company_id))
        if not persona:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Persona {persona_request.persona_id} not found"
            )

    # Update chatbot with new persona
    service = ChatbotService()
    chatbot_update = ChatbotUpdate(persona_id=persona_request.persona_id)
    chatbot = await service.update_chatbot(chatbot_id, chatbot_update, str(company_id))

    if not chatbot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chatbot {chatbot_id} not found"
        )

    return chatbot


@router.put("/{chatbot_id}/kb-mode", response_model=Chatbot)
async def set_kb_mode(
    chatbot_id: str,
    kb_request: KBModeRequest,
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("edit_chatbots"))
):
    """
    Set knowledge base access mode for a chatbot

    - **chatbot_id**: UUID of the chatbot
    - **use_shared_kb**: True = use shared KB, False = use selected documents only
    - **selected_document_ids**: Required if use_shared_kb=False

    Shared KB mode: Chatbot searches all shared documents in the company's KB
    Selected mode: Chatbot only searches the explicitly selected documents
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User must be associated with a company"
        )

    # Validate: if not using shared KB, must have selected documents
    if not kb_request.use_shared_kb and not kb_request.selected_document_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="selected_document_ids is required when use_shared_kb=false"
        )

    # Verify selected documents exist and belong to company
    if kb_request.selected_document_ids:
        from app.services.document_service import get_document_by_id
        for doc_id in kb_request.selected_document_ids:
            doc = await get_document_by_id(doc_id)
            if not doc or doc.get("company_id") != str(company_id):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Document {doc_id} not found or doesn't belong to your company"
                )

    # Update chatbot with KB mode settings
    service = ChatbotService()
    chatbot_update = ChatbotUpdate(
        use_shared_kb=kb_request.use_shared_kb,
        selected_document_ids=kb_request.selected_document_ids
    )
    chatbot = await service.update_chatbot(chatbot_id, chatbot_update, str(company_id))

    if not chatbot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chatbot {chatbot_id} not found"
        )

    return chatbot
