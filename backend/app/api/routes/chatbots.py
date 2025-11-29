"""
Chatbot CRUD API routes for multi-bot management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.models.chatbot import (
    ChatbotCreate,
    ChatbotUpdate,
    Chatbot,
    ChatbotWithEmbedCode,
    ChatbotDeploy,
    ChatbotStats
)
from app.services.chatbot_service import ChatbotService
from app.core.dependencies import get_current_user, require_permission, require_any_permission
from app.models.user import User

router = APIRouter()


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
