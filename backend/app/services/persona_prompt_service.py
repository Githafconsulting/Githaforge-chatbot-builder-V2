"""
Persona Prompt Generator Service

Uses LLM to generate role-specific system prompts from persona descriptions.

Follows KISS, YAGNI, DRY, and SOLID principles.
"""
from typing import Optional
from app.services.llm_service import generate_response
from app.utils.logger import get_logger

logger = get_logger(__name__)


# ============================================================================
# PROMPT GENERATION TEMPLATE
# ============================================================================

PROMPT_GENERATOR_TEMPLATE = """You are an expert at writing system prompts for AI customer service chatbots.

Your task is to create a professional, effective system prompt for a chatbot with the following role:

ROLE NAME: {persona_name}
ROLE DESCRIPTION: {persona_description}
COMPANY NAME: {company_name}

{additional_context}

Create a system prompt that:
1. Clearly defines the chatbot's role and responsibilities
2. Sets appropriate tone and communication style for this role
3. Includes specific guidelines relevant to the role
4. Uses placeholders for dynamic content:
   - {{brand_name}} - Will be replaced with the company/brand name
   - {{support_email}} - Will be replaced with the support email
   - {{brand_website}} - Will be replaced with the company website
   - {{context}} - Will be replaced with retrieved knowledge base content
   - {{history}} - Will be replaced with conversation history
   - {{query}} - Will be replaced with the user's question

CRITICAL RESPONSE STYLE RULES (MUST INCLUDE THESE):
- Keep responses CONCISE: 2-3 sentences maximum for most answers
- Be DIRECT: Start with the answer, not with preambles like "Based on our documentation..."
- NO FILLER: Avoid phrases like "I'd be happy to help", "Great question", "Let me explain"
- ELIMINATE REDUNDANCY: Say things once, don't repeat or paraphrase the same point
- ONE FOLLOW-UP MAX: Only ask one follow-up question if truly needed
- PRIORITIZE KEY INFO: Lead with the most important detail first

IMPORTANT FORMATTING RULES:
- Use single curly braces for the placeholders: {{brand_name}}, {{support_email}}, {{brand_website}}, {{context}}, {{history}}, {{query}}
- Keep the prompt under 2000 characters
- Be specific and actionable
- Focus on the unique aspects of this role
- Include a clear structure with role definition, guidelines, and the required placeholders at the end
- MUST include the conciseness rules from above in the generated prompt

Generate ONLY the system prompt text, nothing else. Start directly with "You are..." or similar."""


# ============================================================================
# PROMPT GENERATION FUNCTIONS
# ============================================================================

async def generate_persona_prompt(
    persona_name: str,
    persona_description: str,
    company_name: str,
    additional_context: Optional[str] = None
) -> str:
    """
    Use LLM to generate a system prompt for a persona/role.

    Args:
        persona_name: Name of the persona (e.g., "HR Support")
        persona_description: User's description of the persona's purpose
        company_name: Company name for personalization
        additional_context: Optional additional context from user

    Returns:
        Generated system prompt string
    """
    try:
        # Build the generation prompt
        context_text = f"ADDITIONAL CONTEXT: {additional_context}" if additional_context else ""

        prompt = PROMPT_GENERATOR_TEMPLATE.format(
            persona_name=persona_name,
            persona_description=persona_description,
            company_name=company_name,
            additional_context=context_text
        )

        # Generate the prompt using LLM
        generated_prompt = await generate_response(
            prompt,
            max_tokens=1500,
            temperature=0.7
        )

        # Clean up the response
        generated_prompt = generated_prompt.strip()

        # Ensure required placeholders are present
        required_placeholders = ["{context}", "{history}", "{query}"]
        for placeholder in required_placeholders:
            if placeholder not in generated_prompt:
                logger.warning(f"Generated prompt missing placeholder: {placeholder}")
                # Append missing structure at the end
                generated_prompt += f"""

Context from knowledge base:
{{context}}

Conversation history:
{{history}}

User question: {{query}}

Provide a helpful response:"""
                break  # Only add once

        logger.info(f"Generated prompt for persona '{persona_name}' ({len(generated_prompt)} chars)")
        return generated_prompt

    except Exception as e:
        logger.error(f"Error generating persona prompt: {str(e)}")
        # Return a default fallback prompt
        return _get_fallback_prompt(persona_name, persona_description)


async def regenerate_persona_prompt(
    persona_name: str,
    persona_description: str,
    company_name: str,
    current_prompt: str,
    regenerate_context: Optional[str] = None
) -> str:
    """
    Regenerate a persona's system prompt with additional context.

    This is useful when users want to tweak the prompt based on feedback.

    Args:
        persona_name: Name of the persona
        persona_description: User's description of the persona's purpose
        company_name: Company name for personalization
        current_prompt: The current system prompt for reference
        regenerate_context: User's notes for regeneration

    Returns:
        Newly generated system prompt string
    """
    try:
        context_text = ""
        if regenerate_context:
            context_text = f"""
CURRENT PROMPT (for reference):
{current_prompt[:500]}...

USER FEEDBACK FOR REGENERATION:
{regenerate_context}

Please incorporate this feedback while maintaining the core structure and placeholders."""

        return await generate_persona_prompt(
            persona_name=persona_name,
            persona_description=persona_description,
            company_name=company_name,
            additional_context=context_text
        )

    except Exception as e:
        logger.error(f"Error regenerating persona prompt: {str(e)}")
        raise


def _get_fallback_prompt(persona_name: str, persona_description: str) -> str:
    """
    Get a fallback prompt when LLM generation fails.

    Args:
        persona_name: Name of the persona
        persona_description: Description of the persona

    Returns:
        Basic fallback system prompt
    """
    return f"""You are a professional {persona_name.lower()} assistant for {{brand_name}}.

Your role is to:
{persona_description}

GUIDELINES:
- Be helpful, accurate, and professional
- Answer questions based ONLY on the provided context
- If you don't have enough information, recommend contacting {{support_email}}

RESPONSE STYLE (CRITICAL):
- Keep responses to 2-3 sentences maximum
- Be DIRECT - start with the answer, no preambles
- NO filler phrases ("I'd be happy to help", "Great question")
- Lead with the most important information first

Context from knowledge base:
{{context}}

Conversation history:
{{history}}

User question: {{query}}

Provide a helpful response:"""
