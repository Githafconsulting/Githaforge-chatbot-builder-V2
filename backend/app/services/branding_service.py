"""
Chatbot Branding Service

Manages chatbot-specific branding for prompts and responses.
Enables proper isolation between different chatbots (e.g., Githaforge vs Githaf Consulting).
"""
from typing import Dict, Optional, Any
from dataclasses import dataclass
import random
from app.core.database import get_supabase_client
from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class ChatbotBranding:
    """Branding configuration for a chatbot"""
    brand_name: str
    support_email: str
    brand_website: str
    greeting_message: str
    fallback_response: Optional[str] = None
    # Extended contact details
    contact_phone: Optional[str] = None
    contact_address: Optional[str] = None
    contact_hours: Optional[str] = None

    # Generic defaults (used when chatbot and company have no branding set)
    DEFAULT_BRAND_NAME = "AI Assistant"
    DEFAULT_SUPPORT_EMAIL = "support@example.com"
    DEFAULT_BRAND_WEBSITE = "https://example.com"
    DEFAULT_GREETING = "Hello! How can I help you today?"


# Cache for chatbot branding (reduces database queries)
_branding_cache: Dict[str, ChatbotBranding] = {}


async def get_chatbot_branding(chatbot_id: Optional[str] = None) -> ChatbotBranding:
    """
    Get branding configuration for a chatbot.

    Fallback chain for each field:
    1. chatbot.field (if set)
    2. company.field (if chatbot.field is NULL)
    3. Generic default (if both are NULL)

    Args:
        chatbot_id: Chatbot UUID. If None, returns generic default branding.

    Returns:
        ChatbotBranding object with brand_name, support_email, brand_website
    """
    # Default branding (generic)
    if not chatbot_id:
        return ChatbotBranding(
            brand_name=ChatbotBranding.DEFAULT_BRAND_NAME,
            support_email=ChatbotBranding.DEFAULT_SUPPORT_EMAIL,
            brand_website=ChatbotBranding.DEFAULT_BRAND_WEBSITE,
            greeting_message=ChatbotBranding.DEFAULT_GREETING
        )

    # Check cache first
    if chatbot_id in _branding_cache:
        return _branding_cache[chatbot_id]

    try:
        client = get_supabase_client()

        # Fetch chatbot branding WITH company info for fallback chain
        # Include custom contact fields for extended branding
        response = client.table("chatbots").select(
            "brand_name, support_email, brand_website, greeting_message, fallback_response, "
            "enable_custom_contact, contact_phone, contact_email, contact_address, contact_hours, "
            "companies(name, website, support_email)"
        ).eq("id", chatbot_id).single().execute()

        if response.data:
            # Extract company data for fallback
            company = response.data.get("companies") or {}
            enable_custom = response.data.get("enable_custom_contact", False)

            # Apply fallback chain: chatbot → company → default
            # For email: custom contact_email → support_email → company.support_email → default
            support_email = ChatbotBranding.DEFAULT_SUPPORT_EMAIL
            if enable_custom and response.data.get("contact_email"):
                support_email = response.data.get("contact_email")
            elif response.data.get("support_email"):
                support_email = response.data.get("support_email")
            elif company.get("support_email"):
                support_email = company.get("support_email")

            branding = ChatbotBranding(
                brand_name=(
                    response.data.get("brand_name")
                    or company.get("name")
                    or ChatbotBranding.DEFAULT_BRAND_NAME
                ),
                support_email=support_email,
                brand_website=(
                    response.data.get("brand_website")
                    or company.get("website")
                    or ChatbotBranding.DEFAULT_BRAND_WEBSITE
                ),
                greeting_message=(
                    response.data.get("greeting_message")
                    or ChatbotBranding.DEFAULT_GREETING
                ),
                fallback_response=response.data.get("fallback_response"),
                # Extended contact details (only if custom contact is enabled)
                contact_phone=response.data.get("contact_phone") if enable_custom else None,
                contact_address=response.data.get("contact_address") if enable_custom else None,
                contact_hours=response.data.get("contact_hours") if enable_custom else None
            )

            # Cache the branding
            _branding_cache[chatbot_id] = branding
            logger.debug(f"Cached branding for chatbot {chatbot_id}: {branding.brand_name}")

            return branding

    except Exception as e:
        logger.warning(f"Failed to fetch chatbot branding for {chatbot_id}: {e}")

    # Return default if lookup fails
    return ChatbotBranding(
        brand_name=ChatbotBranding.DEFAULT_BRAND_NAME,
        support_email=ChatbotBranding.DEFAULT_SUPPORT_EMAIL,
        brand_website=ChatbotBranding.DEFAULT_BRAND_WEBSITE,
        greeting_message=ChatbotBranding.DEFAULT_GREETING
    )


def clear_branding_cache(chatbot_id: Optional[str] = None):
    """Clear branding cache for a chatbot or all chatbots"""
    global _branding_cache
    if chatbot_id:
        _branding_cache.pop(chatbot_id, None)
    else:
        _branding_cache = {}


# ============================================================================
# DYNAMIC PROMPT GENERATORS
# ============================================================================

def _build_contact_details_section(branding: ChatbotBranding) -> str:
    """
    Build official contact details section for system prompts.

    Only includes section if at least one contact detail is configured.
    These details take priority over KB documents for contact-related queries.
    """
    contact_lines = []

    # Always include email and website (these are always available)
    contact_lines.append(f"- Email: {branding.support_email}")
    contact_lines.append(f"- Website: {branding.brand_website}")

    # Add extended contact details if configured
    if branding.contact_phone:
        contact_lines.append(f"- Phone: {branding.contact_phone}")
    if branding.contact_address:
        contact_lines.append(f"- Address: {branding.contact_address}")
    if branding.contact_hours:
        contact_lines.append(f"- Business Hours: {branding.contact_hours}")

    # Only add section if we have extended contact details beyond defaults
    has_extended_details = branding.contact_phone or branding.contact_address or branding.contact_hours

    if has_extended_details:
        return f"""
OFFICIAL CONTACT INFORMATION (use these exact details for contact-related queries):
{chr(10).join(contact_lines)}

"""
    else:
        return ""


def _build_help_contact_section(branding: ChatbotBranding) -> str:
    """
    Build contact info for help responses (user-facing format).

    Returns formatted contact section only if extended details are available.
    """
    has_extended = branding.contact_phone or branding.contact_address or branding.contact_hours

    if not has_extended:
        return ""

    lines = [f"\n📞 **Quick Contact:**"]
    lines.append(f"• Email: {branding.support_email}")

    if branding.contact_phone:
        lines.append(f"• Phone: {branding.contact_phone}")
    if branding.contact_hours:
        lines.append(f"• Hours: {branding.contact_hours}")

    return chr(10).join(lines) + "\n"


def generate_rag_system_prompt(branding: ChatbotBranding) -> str:
    """Generate RAG system prompt with chatbot branding"""

    # Build official contact details section if any are configured
    contact_details = _build_contact_details_section(branding)

    return f"""You are a helpful and professional customer service assistant for {branding.brand_name}.

Your role is to:
- Provide accurate, helpful information about {branding.brand_name}'s services and operations
- Be polite, empathetic, and professional
- Answer questions based ONLY on the provided context
- If you don't have enough information, politely say so and suggest contacting human support
- Keep responses CONCISE and PRECISE (2-3 sentences maximum)
- Never make up information not present in the context
{contact_details}
RESPONSE STYLE RULES:
- Be DIRECT and TO THE POINT - avoid unnecessary preambles like "According to our documentation..."
- Use SIMPLE LANGUAGE - avoid corporate jargon unless necessary
- PRIORITIZE KEY INFORMATION - lead with the most important details
- ELIMINATE REDUNDANCY - say things once, not multiple times
- USE ACTIVE VOICE - "We offer X" instead of "X is offered by us"
- COMBINE RELATED POINTS - merge similar information into single sentences

CONVERSATION FLOW:
- After answering a question, occasionally offer follow-up help with phrases like:
  * "Is there anything else you'd like to know?"
  * "Do you have any other questions about [topic]?"
  * "Would you like more details on any of this?"
- Use follow-up offers sparingly (not every response) - typically after providing substantial information
- If user says "okay thanks", "no that's all", "I'm good", etc., recognize this as a closing signal and respond warmly

IMPORTANT GUIDELINES:
- Always ground your answers in the provided context
- NEVER fabricate or invent information (addresses, phone numbers, names, etc.)
- If the context doesn't contain the specific information requested, be honest and say you don't have that information
- For missing contact details (location, address), recommend: "For specific location/address information, please visit our website at {branding.brand_website} or contact us at {branding.support_email}"
- If you have partial information (e.g., email but not address), share what you have and recommend website/email for the rest
- Maintain a warm, professional tone aligned with {branding.brand_name}'s brand
- Avoid phrases like "according to our documentation" or "based on company materials" - just state the facts directly

Context from knowledge base:
{{context}}

Conversation history:
{{history}}

User question: {{query}}

Provide a helpful, accurate response based on the context above:"""


def generate_fallback_response(branding: ChatbotBranding) -> str:
    """Generate fallback response with chatbot branding"""
    if branding.fallback_response:
        return branding.fallback_response

    # Build contact options dynamically based on available info
    contact_options = []
    contact_options.append(f"- Contact our support team at {branding.support_email}")
    contact_options.append(f"- Visit our website at {branding.brand_website}")

    if branding.contact_phone:
        contact_options.append(f"- Call us at {branding.contact_phone}")
    else:
        contact_options.append("- Call us during business hours")

    if branding.contact_hours:
        contact_options.append(f"- Our hours: {branding.contact_hours}")

    if branding.contact_address:
        contact_options.append(f"- Visit us at: {branding.contact_address}")

    return f"""I don't have enough information to answer that question accurately.

For the best assistance, please:
{chr(10).join(contact_options)}

Is there anything else I can help you with?"""


def generate_greeting_responses(branding: ChatbotBranding) -> list:
    """Generate greeting responses with chatbot branding"""
    return [
        f"Hello! 👋 Welcome to {branding.brand_name}. How can I assist you today?",
        f"Hi there! Thanks for reaching out to {branding.brand_name}. What can I help you with?",
        f"Good day! I'm here to help answer your questions about {branding.brand_name}'s services. What would you like to know?",
        f"Hello! I'm {branding.brand_name}'s virtual assistant. How may I help you today?",
        f"Hi! Welcome to {branding.brand_name}. I'm here to assist with any questions you have about our services.",
    ]


def generate_farewell_responses(branding: ChatbotBranding) -> list:
    """Generate farewell responses with chatbot branding"""
    return [
        f"Goodbye! Thank you for contacting {branding.brand_name}. Feel free to reach out anytime you need assistance. Have a great day! 👋",
        "Take care! If you have any more questions in the future, don't hesitate to ask. We're here to help!",
        "Thank you for chatting with us! Have a wonderful day, and feel free to return anytime you need support.",
        "Goodbye! It was great assisting you. We look forward to hearing from you again soon!",
        "See you later! Don't hesitate to contact us if you need anything else. Have an excellent day!",
    ]


def generate_gratitude_responses(branding: ChatbotBranding) -> list:
    """Generate gratitude responses with chatbot branding"""
    return [
        "You're very welcome! 😊 Is there anything else I can help you with?",
        f"Happy to help! If you have any other questions about {branding.brand_name}, feel free to ask.",
        "My pleasure! Let me know if there's anything else you'd like to know about our services.",
        "You're welcome! I'm here if you need any more information or assistance.",
        "Glad I could help! Don't hesitate to reach out if you have more questions.",
    ]


def generate_help_response(branding: ChatbotBranding) -> str:
    """Generate help response with chatbot branding"""
    # Build contact info section if details are available
    contact_info = _build_help_contact_section(branding)

    return f"""I'm {branding.brand_name}'s virtual assistant! 🤖 I'm here to help answer your questions about:

• **Our Services** - What we offer and our expertise
• **Getting Started** - How to begin working with us
• **Pricing & Packages** - Information about costs and service packages
• **Contact Information** - How to reach our team
• **Business Operations** - Hours, availability, and processes
• **Project Requirements** - What we need to get started
{contact_info}
Just ask me anything about {branding.brand_name}, and I'll do my best to provide accurate information based on our knowledge base.

What would you like to know?"""


def generate_chit_chat_responses(branding: ChatbotBranding) -> dict:
    """Generate chit-chat responses with chatbot branding"""
    return {
        "how_are_you": [
            f"I'm doing great, thank you for asking! I'm here and ready to help you with any questions about {branding.brand_name}. How can I assist you today?",
            f"I'm functioning perfectly! More importantly, how can I help you with {branding.brand_name} services today?",
        ],
        "name": [
            f"I'm {branding.brand_name}'s virtual assistant! I don't have a personal name, but I'm here to help answer your questions about our services. What would you like to know?",
            f"You can call me the {branding.brand_name} Assistant! I'm designed to help answer questions about {branding.brand_name}. How can I assist you?",
        ],
        "bot": [
            f"Yes, I'm an AI assistant created to help answer questions about {branding.brand_name}'s services! I use information from our knowledge base to provide accurate answers. What can I help you with?",
            f"That's right! I'm an AI-powered assistant here to provide information about {branding.brand_name}. While I'm not human, I'm well-equipped to answer your questions about our services!",
        ],
        "default": [
            f"That's an interesting question! However, I'm specifically designed to help with inquiries about {branding.brand_name}'s services. Is there anything about our offerings I can help you with?",
            f"I appreciate the chat, but I'm focused on helping with {branding.brand_name} questions. Is there anything about our services, pricing, or how to get started that I can assist with?",
        ],
        "deferral": [
            "No problem at all! Feel free to come back whenever you're ready. Is there anything else I can help you with in the meantime?",
            "Of course, take your time! Let me know if you have any other questions I can help with.",
            "Sure thing! I'll be here whenever you're ready. Is there anything else on your mind?",
            "No worries! Just let me know when you'd like to continue. Anything else I can assist with right now?",
        ]
    }


def generate_out_of_scope_response(branding: ChatbotBranding) -> str:
    """Generate out-of-scope response with chatbot branding"""
    contact_info = _build_help_contact_section(branding)

    return f"""I appreciate your question, but I'm specifically designed to help with inquiries about {branding.brand_name}'s services and operations.

I can help you with:
• Information about our services
• Pricing and project details
• How to get started with {branding.brand_name}
• Contact information and business hours
• Our expertise and capabilities
{contact_info}
Is there anything about {branding.brand_name} I can assist you with?"""


def generate_unclear_query_response(branding: ChatbotBranding) -> str:
    """Generate unclear query response with chatbot branding"""
    contact_info = _build_help_contact_section(branding)

    return f"""I'm not quite sure I understand your question. To help you better, could you please provide more details?

Here are some things I can help with:
• Information about {branding.brand_name}'s services
• How to get started with a project
• Pricing and package details
• Contact information and business hours
{contact_info}
Feel free to ask anything specific about {branding.brand_name}!"""


def generate_conversational_context_prompt(branding: ChatbotBranding) -> str:
    """Generate context-aware conversational prompt with branding"""
    return f"""You are a friendly customer service assistant for {branding.brand_name}. The user has said: "{{query}}"

Previous conversation:
{{history}}

Provide a brief, natural response that:
1. Acknowledges their message in context of the conversation
2. Gently redirects to {branding.brand_name} topics if appropriate
3. Is warm and professional
4. Keeps the response under 2 sentences

Response:"""


# ============================================================================
# BRANDED RESPONSE SELECTION
# ============================================================================

async def get_branded_greeting(chatbot_id: Optional[str] = None) -> str:
    """Get a random branded greeting response"""
    branding = await get_chatbot_branding(chatbot_id)
    responses = generate_greeting_responses(branding)
    return random.choice(responses)


async def get_branded_farewell(chatbot_id: Optional[str] = None) -> str:
    """Get a random branded farewell response"""
    branding = await get_chatbot_branding(chatbot_id)
    responses = generate_farewell_responses(branding)
    return random.choice(responses)


async def get_branded_gratitude(chatbot_id: Optional[str] = None) -> str:
    """Get a random branded gratitude response"""
    branding = await get_chatbot_branding(chatbot_id)
    responses = generate_gratitude_responses(branding)
    return random.choice(responses)


async def get_branded_help(chatbot_id: Optional[str] = None) -> str:
    """Get branded help response"""
    branding = await get_chatbot_branding(chatbot_id)
    return generate_help_response(branding)


async def get_branded_chit_chat(category: str, chatbot_id: Optional[str] = None) -> str:
    """Get a random branded chit-chat response for a category"""
    branding = await get_chatbot_branding(chatbot_id)
    responses = generate_chit_chat_responses(branding)
    return random.choice(responses.get(category, responses["default"]))


async def get_branded_out_of_scope(chatbot_id: Optional[str] = None) -> str:
    """Get branded out-of-scope response"""
    branding = await get_chatbot_branding(chatbot_id)
    return generate_out_of_scope_response(branding)


async def get_branded_fallback(chatbot_id: Optional[str] = None) -> str:
    """Get branded fallback response"""
    branding = await get_chatbot_branding(chatbot_id)
    return generate_fallback_response(branding)


async def get_branded_unclear(chatbot_id: Optional[str] = None) -> str:
    """Get branded unclear query response"""
    branding = await get_chatbot_branding(chatbot_id)
    return generate_unclear_query_response(branding)
