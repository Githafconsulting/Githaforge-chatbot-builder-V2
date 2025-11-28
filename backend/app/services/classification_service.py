"""
Document Classification Service

Uses LLM (Groq) to automatically classify and tag documents with:
- Scope: sales, support, product, billing, hr, legal, marketing, general
- Categories: Relevant tags for organization
- Topics: Key subjects covered in the document
- Confidence: Classification confidence score (0.0-1.0)

This enables chatbots to filter knowledge base by scope for more relevant responses.
"""
import json
from typing import Dict, List, Optional
from groq import Groq
from app.core.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class ClassificationResult:
    """Document classification result"""

    def __init__(
        self,
        scope: str,
        categories: List[str],
        topics: List[str],
        confidence: float,
        reasoning: Optional[str] = None
    ):
        self.scope = scope
        self.categories = categories
        self.topics = topics
        self.confidence = confidence
        self.reasoning = reasoning

    def to_dict(self) -> Dict:
        """Convert to dictionary for database storage"""
        return {
            "scope": self.scope,
            "categories": self.categories,
            "topics": self.topics,
            "confidence": self.confidence,
            "reasoning": self.reasoning
        }


class DocumentClassificationService:
    """Service for AI-powered document classification"""

    # Predefined scopes
    VALID_SCOPES = [
        "sales",      # Sales materials, pricing, proposals
        "support",    # Support docs, FAQs, troubleshooting
        "product",    # Product features, documentation, guides
        "billing",    # Billing, payments, invoices
        "hr",         # HR policies, benefits, onboarding
        "legal",      # Legal docs, terms, policies
        "marketing",  # Marketing materials, campaigns
        "general"     # General information, catch-all
    ]

    def __init__(self):
        """Initialize classification service with Groq client"""
        try:
            self.client = Groq(api_key=settings.GROQ_API_KEY)
            self.model = "llama-3.1-8b-instant"  # Fast, accurate model
            logger.info("Document classification service initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Groq client: {e}")
            self.client = None

    async def classify_document(
        self,
        content: str,
        filename: str = "",
        company_scopes: Optional[List[str]] = None
    ) -> ClassificationResult:
        """
        Classify a document using LLM

        Args:
            content: Document text content (first 2000 chars used)
            filename: Original filename (helps with context)
            company_scopes: Custom scopes defined by company (optional)

        Returns:
            ClassificationResult: Classification with scope, categories, topics

        Example:
            result = await classifier.classify_document(
                content="How to reset your password...",
                filename="password_reset.pdf"
            )
            # result.scope = "support"
            # result.categories = ["authentication", "security"]
            # result.topics = ["password reset", "account access"]
        """
        if not self.client:
            logger.warning("Groq client not initialized, using fallback classification")
            return self._fallback_classification(content, filename)

        try:
            # Truncate content to avoid token limits (2000 chars ~= 500 tokens)
            truncated_content = content[:2000] if len(content) > 2000 else content

            # Build scope list (predefined + custom)
            all_scopes = self.VALID_SCOPES.copy()
            if company_scopes:
                all_scopes.extend([s for s in company_scopes if s not in all_scopes])

            # Build LLM prompt
            prompt = self._build_classification_prompt(
                content=truncated_content,
                filename=filename,
                scopes=all_scopes
            )

            # Call Groq API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a document classification expert. Analyze documents and return classification in JSON format."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,  # Low temperature for consistent classification
                max_tokens=500,
                response_format={"type": "json_object"}  # Force JSON response
            )

            # Parse LLM response
            result_text = response.choices[0].message.content
            result_data = json.loads(result_text)

            # Extract and validate fields
            scope = result_data.get("scope", "general")
            if scope not in all_scopes:
                logger.warning(f"LLM returned invalid scope '{scope}', defaulting to 'general'")
                scope = "general"

            categories = result_data.get("categories", [])[:5]  # Max 5 categories
            topics = result_data.get("topics", [])[:5]  # Max 5 topics
            confidence = float(result_data.get("confidence", 0.7))
            reasoning = result_data.get("reasoning", "")

            # Clamp confidence to 0.0-1.0
            confidence = max(0.0, min(1.0, confidence))

            logger.info(
                f"Classified document '{filename}' - "
                f"Scope: {scope}, "
                f"Categories: {len(categories)}, "
                f"Confidence: {confidence:.2f}"
            )

            return ClassificationResult(
                scope=scope,
                categories=categories,
                topics=topics,
                confidence=confidence,
                reasoning=reasoning
            )

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            return self._fallback_classification(content, filename)
        except Exception as e:
            logger.error(f"Error during document classification: {e}")
            return self._fallback_classification(content, filename)

    def _build_classification_prompt(
        self,
        content: str,
        filename: str,
        scopes: List[str]
    ) -> str:
        """
        Build LLM prompt for document classification

        Args:
            content: Document content
            filename: Filename
            scopes: Valid scope values

        Returns:
            str: Formatted prompt
        """
        prompt = f"""Analyze this document and classify it into the most appropriate category.

**Filename:** {filename if filename else "Unknown"}

**Document Content (excerpt):**
{content}

**Available Scopes:**
{', '.join(scopes)}

**Scope Definitions:**
- sales: Sales materials, pricing, product proposals, customer acquisition
- support: Customer support, FAQs, troubleshooting, how-to guides
- product: Product features, technical documentation, user manuals
- billing: Billing information, invoices, payment processes
- hr: HR policies, employee benefits, onboarding, company culture
- legal: Legal documents, terms of service, privacy policies, compliance
- marketing: Marketing campaigns, promotional materials, brand guidelines
- general: General information that doesn't fit other categories

**Task:**
Return a JSON object with the following structure:
{{
  "scope": "one of the available scopes",
  "categories": ["tag1", "tag2", "tag3"],
  "topics": ["main topic 1", "main topic 2"],
  "confidence": 0.85,
  "reasoning": "Brief explanation of why this scope was chosen"
}}

**Guidelines:**
- Choose the MOST appropriate scope based on primary purpose
- Provide 2-5 relevant category tags (lowercase, hyphenated)
- Identify 1-3 main topics covered
- Confidence should be 0.0-1.0 (higher = more certain)
- Be concise in reasoning (1-2 sentences)

Return ONLY valid JSON, no additional text."""

        return prompt

    def _fallback_classification(
        self,
        content: str,
        filename: str
    ) -> ClassificationResult:
        """
        Fallback classification using simple keyword matching

        Used when LLM API is unavailable or fails

        Args:
            content: Document content
            filename: Filename

        Returns:
            ClassificationResult: Basic classification
        """
        content_lower = content.lower()
        filename_lower = filename.lower() if filename else ""

        # Keyword-based scope detection
        scope_keywords = {
            "sales": ["pricing", "quote", "proposal", "sales", "purchase", "buy"],
            "support": ["faq", "help", "support", "troubleshoot", "how to", "guide", "tutorial"],
            "product": ["feature", "specification", "manual", "documentation", "api", "sdk"],
            "billing": ["invoice", "payment", "bill", "subscription", "charge", "refund"],
            "hr": ["policy", "employee", "benefits", "onboarding", "vacation", "leave"],
            "legal": ["terms", "privacy", "legal", "compliance", "gdpr", "agreement"],
            "marketing": ["campaign", "promotion", "marketing", "brand", "advertisement"]
        }

        # Check filename and content for keywords
        detected_scope = "general"
        max_matches = 0

        for scope, keywords in scope_keywords.items():
            matches = sum(1 for kw in keywords if kw in content_lower or kw in filename_lower)
            if matches > max_matches:
                max_matches = matches
                detected_scope = scope

        # Simple category extraction (first 3 capitalized words)
        words = content.split()
        categories = [
            w.lower().strip(".,!?")
            for w in words
            if w[0].isupper() and len(w) > 3
        ][:3]

        if not categories:
            categories = [detected_scope]

        logger.info(f"Fallback classification for '{filename}': {detected_scope}")

        return ClassificationResult(
            scope=detected_scope,
            categories=categories,
            topics=[detected_scope],
            confidence=0.5,  # Lower confidence for fallback
            reasoning="Fallback classification based on keyword matching"
        )

    async def batch_classify(
        self,
        documents: List[Dict[str, str]],
        company_scopes: Optional[List[str]] = None
    ) -> List[ClassificationResult]:
        """
        Classify multiple documents in batch

        Args:
            documents: List of dicts with 'content' and 'filename' keys
            company_scopes: Custom scopes (optional)

        Returns:
            List[ClassificationResult]: Classification results

        Example:
            docs = [
                {"content": "...", "filename": "doc1.pdf"},
                {"content": "...", "filename": "doc2.txt"}
            ]
            results = await classifier.batch_classify(docs)
        """
        results = []

        for doc in documents:
            result = await self.classify_document(
                content=doc.get("content", ""),
                filename=doc.get("filename", ""),
                company_scopes=company_scopes
            )
            results.append(result)

        logger.info(f"Batch classified {len(documents)} documents")
        return results


# Singleton instance
_classification_service = None


def get_classification_service() -> DocumentClassificationService:
    """
    Get singleton classification service instance

    Returns:
        DocumentClassificationService: Classification service

    Example:
        classifier = get_classification_service()
        result = await classifier.classify_document(content, filename)
    """
    global _classification_service
    if _classification_service is None:
        _classification_service = DocumentClassificationService()
    return _classification_service
