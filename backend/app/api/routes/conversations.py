"""
Conversation API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.models.conversation import ConversationList, ConversationDetail
from app.services.conversation_service import get_all_conversations, get_conversation_detail, end_conversation
from app.core.dependencies import get_current_user
from app.core.multitenancy import (
    get_filtered_company_id,
    verify_resource_ownership
)
from app.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


class EndConversationRequest(BaseModel):
    session_id: str


@router.get("/", response_model=ConversationList)
async def list_conversations(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all conversations

    Returns conversations filtered by user's company.
    Super admins see all conversations across all companies.

    Requires authentication
    """
    try:
        # Get company filter (None for super admin, company_id for regular users)
        company_id = get_filtered_company_id(current_user)

        result = await get_all_conversations(
            limit=limit,
            offset=offset,
            company_id=company_id
        )

        # Handle both old format (list) and new format (dict with metadata)
        if isinstance(result, dict):
            conversations = result.get("conversations", [])
            total = result.get("total", len(conversations))
        else:
            conversations = result
            total = len(conversations)

        return ConversationList(
            conversations=conversations,
            total=total
        )

    except Exception as e:
        logger.error(f"Error listing conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed conversation with messages

    Verifies user owns the conversation or is super admin.

    Requires authentication
    """
    try:
        conversation = await get_conversation_detail(conversation_id)

        # Verify ownership
        verify_resource_ownership(conversation, conversation_id, current_user, "Conversation")

        return conversation

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/end")
async def end_conversation_endpoint(request: EndConversationRequest):
    """
    Mark a conversation as ended (when user closes chatbot window)

    This is a public endpoint (no authentication required) so the chat widget can call it.
    """
    try:
        success = await end_conversation(request.session_id)

        if success:
            return {"success": True, "message": "Conversation ended successfully"}
        else:
            raise HTTPException(status_code=404, detail="Conversation not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))
