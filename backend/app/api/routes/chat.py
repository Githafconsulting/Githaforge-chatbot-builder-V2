"""
Chat API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Request, status
from app.models.message import ChatRequest, ChatResponse
from app.services.rag_service import get_rag_response
from app.services.conversation_service import get_or_create_conversation, save_message
from app.services.billing_service import billing_service
from app.middleware.rate_limiter import limiter
from app.utils.logger import get_logger
from app.utils.geolocation import get_country_from_ip, anonymize_ip
from app.core.config import settings
from app.core.database import get_supabase_client
from typing import Optional, Dict, Any
import uuid

router = APIRouter()
logger = get_logger(__name__)

# Default message when chatbot is paused
DEFAULT_PAUSED_MESSAGE = "This chatbot is currently unavailable. Please try again later or contact support."


async def get_chatbot_status(chatbot_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch chatbot deploy_status, paused_message, and company_id from database.

    Returns:
        Dict with deploy_status, paused_message, is_active, company_id, or None if not found
    """
    if not chatbot_id:
        return None

    try:
        client = get_supabase_client()
        response = client.table("chatbots").select(
            "deploy_status, paused_message, is_active, company_id"
        ).eq("id", chatbot_id).single().execute()

        if response.data:
            return response.data
        return None
    except Exception as e:
        logger.warning(f"Failed to fetch chatbot status for {chatbot_id}: {e}")
        return None


@router.post("/", response_model=ChatResponse)
@limiter.limit("10/minute")
async def chat(chat_request: ChatRequest, request: Request):
    """
    Send a message and get AI response

    Rate limit: 10 requests per minute per IP
    """
    try:
        # Generate session ID if not provided
        session_id = chat_request.session_id or str(uuid.uuid4())

        # Determine which chatbot to use for knowledge base scoping
        # If no chatbot_id provided, use the system chatbot (website demo)
        chatbot_id = chat_request.chatbot_id
        if not chatbot_id and settings.SYSTEM_CHATBOT_ID:
            chatbot_id = settings.SYSTEM_CHATBOT_ID
            logger.info(f"Using system chatbot for public chat: {chatbot_id[:8]}...")

        # Initialize chatbot_status for usage tracking later
        chatbot_status = None

        # Check if chatbot is paused or inactive
        if chatbot_id:
            chatbot_status = await get_chatbot_status(chatbot_id)

            if chatbot_status:
                # Check if chatbot is inactive (deleted)
                if not chatbot_status.get("is_active", True):
                    logger.warning(f"Chat attempt to inactive chatbot: {chatbot_id[:8]}...")
                    return ChatResponse(
                        response="This chatbot is no longer available.",
                        session_id=session_id,
                        sources=None,
                        context_found=False,
                        message_id=None
                    )

                # Check if chatbot is paused
                if chatbot_status.get("deploy_status") == "paused":
                    paused_message = chatbot_status.get("paused_message") or DEFAULT_PAUSED_MESSAGE
                    logger.info(f"Chat attempt to paused chatbot: {chatbot_id[:8]}...")
                    return ChatResponse(
                        response=paused_message,
                        session_id=session_id,
                        sources=None,
                        context_found=False,
                        message_id=None
                    )

                # Check if chatbot is still in draft mode
                if chatbot_status.get("deploy_status") == "draft":
                    logger.warning(f"Chat attempt to draft chatbot: {chatbot_id[:8]}...")
                    return ChatResponse(
                        response="This chatbot is not yet deployed. Please contact the administrator.",
                        session_id=session_id,
                        sources=None,
                        context_found=False,
                        message_id=None
                    )

                # Check message usage limit for the company
                company_id = chatbot_status.get("company_id")
                if company_id:
                    try:
                        allowed, current_usage, limit = await billing_service.check_usage_limit(
                            company_id, "messages"
                        )
                        if not allowed:
                            logger.warning(
                                f"Message limit exceeded for company {company_id[:8]}... "
                                f"({current_usage}/{limit})"
                            )
                            return ChatResponse(
                                response="Your monthly message limit has been reached. "
                                         "Please upgrade your plan to continue chatting.",
                                session_id=session_id,
                                sources=None,
                                context_found=False,
                                message_id=None
                            )
                    except Exception as e:
                        # Log but don't block if usage check fails
                        logger.warning(f"Failed to check usage limit: {e}")

        # Get client IP address
        client_ip = request.client.host if request.client else None

        # Resolve IP to country (async operation)
        ip_address = None
        country_code = None
        country_name = None

        if client_ip:
            try:
                # Anonymize IP for GDPR compliance
                ip_address = anonymize_ip(client_ip)

                # Get country from IP
                geo_data = await get_country_from_ip(client_ip)
                country_code = geo_data.get("country_code")
                country_name = geo_data.get("country_name")

                logger.info(f"Request from {country_name or 'Unknown'} ({country_code or 'N/A'})")
            except Exception as e:
                logger.warning(f"Failed to resolve IP geolocation: {e}")

        # Get or create conversation with IP tracking
        conversation = await get_or_create_conversation(
            session_id=session_id,
            ip_address=ip_address,
            country_code=country_code,
            country_name=country_name
        )
        conversation_id = conversation["id"]

        # Save user message
        await save_message(
            conversation_id=conversation_id,
            role="user",
            content=chat_request.message
        )

        # Get RAG response with chatbot-scoped knowledge base
        rag_result = await get_rag_response(
            query=chat_request.message,
            session_id=session_id,
            include_history=True,
            chatbot_id=chatbot_id  # Pass chatbot_id for knowledge base scoping
        )

        response_text = rag_result["response"]
        sources = rag_result.get("sources", [])
        context_found = rag_result.get("context_found", len(sources) > 0)

        # Save assistant message
        message = await save_message(
            conversation_id=conversation_id,
            role="assistant",
            content=response_text,
            context_used={"sources": sources} if sources else None
        )

        message_id = str(message["id"]) if message and "id" in message else None

        # Log validation result if available (Phase 1: Observation Layer)
        if message_id and "validation" in rag_result:
            try:
                from app.services.validation_service import log_validation_from_metadata
                await log_validation_from_metadata(message_id, rag_result["validation"])
                logger.info(f"Logged validation result for message {message_id[:8]}...")
            except Exception as e:
                logger.warning(f"Failed to log validation result: {e}")

        # Extract semantic memory if conversation has enough messages (Phase 4: Advanced Memory)
        try:
            from app.services.rag_service import process_conversation_memory

            # Get message count from conversation
            message_count = conversation.get("message_count", 0) + 2  # +2 for current user + assistant messages

            # Only extract memory if conversation has 3+ meaningful exchanges
            if message_count >= 6:  # 3 user messages + 3 assistant messages
                logger.info(f"Extracting semantic memory for conversation {conversation_id[:8]}... ({message_count} messages)")
                memory_result = await process_conversation_memory(conversation_id, session_id)

                if memory_result.get("success") and memory_result.get("facts_stored", 0) > 0:
                    logger.info(f"Stored {memory_result['facts_stored']} semantic facts for session {session_id[:8]}...")
        except Exception as e:
            logger.warning(f"Failed to extract semantic memory: {e}")

        # Increment message usage for billing (count bot response only)
        if chatbot_id and chatbot_status and chatbot_status.get("company_id"):
            try:
                await billing_service.increment_usage(
                    company_id=chatbot_status["company_id"],
                    messages=1  # Count bot response only
                )
            except Exception as e:
                logger.warning(f"Failed to increment message usage: {e}")

        return ChatResponse(
            response=response_text,
            session_id=session_id,
            sources=sources if sources else None,
            context_found=context_found,
            message_id=message_id
        )

    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process chat: {str(e)}")
