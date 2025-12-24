from typing import Optional, List, Tuple
import re

from app.core.database import get_supabase_client
from app.models.faq import (
    FAQCreate,
    FAQUpdate,
    FAQ,
    FAQCategory,
    FAQCategoryCreate,
    FAQCategoryUpdate,
)


def generate_slug(text: str) -> str:
    """Generate a URL-friendly slug from text."""
    slug = text.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    return slug[:100]  # Limit to 100 chars


class FAQService:
    def __init__(self):
        self.client = get_supabase_client()

    # ==================== CATEGORIES ====================

    def get_categories(self, include_inactive: bool = False) -> List[FAQCategory]:
        """Get all FAQ categories."""
        query = self.client.table("faq_categories").select("*")

        if not include_inactive:
            query = query.eq("is_active", True)

        response = query.order("display_order").order("name").execute()
        return [FAQCategory(**cat) for cat in response.data]

    def get_category_by_id(self, category_id: str) -> Optional[FAQCategory]:
        """Get a category by ID."""
        response = (
            self.client.table("faq_categories")
            .select("*")
            .eq("id", category_id)
            .single()
            .execute()
        )
        return FAQCategory(**response.data) if response.data else None

    def get_category_by_slug(self, slug: str) -> Optional[FAQCategory]:
        """Get a category by slug."""
        response = (
            self.client.table("faq_categories")
            .select("*")
            .eq("slug", slug)
            .single()
            .execute()
        )
        return FAQCategory(**response.data) if response.data else None

    def create_category(self, category: FAQCategoryCreate) -> FAQCategory:
        """Create a new category."""
        data = category.model_dump()

        # Auto-generate slug if not unique
        if not data.get("slug"):
            data["slug"] = generate_slug(data["name"])

        response = self.client.table("faq_categories").insert(data).execute()
        return FAQCategory(**response.data[0])

    def update_category(self, category_id: str, category: FAQCategoryUpdate) -> Optional[FAQCategory]:
        """Update a category."""
        data = category.model_dump(exclude_unset=True)
        if not data:
            return self.get_category_by_id(category_id)

        response = (
            self.client.table("faq_categories")
            .update(data)
            .eq("id", category_id)
            .execute()
        )
        return FAQCategory(**response.data[0]) if response.data else None

    def delete_category(self, category_id: str) -> bool:
        """Delete a category."""
        response = (
            self.client.table("faq_categories")
            .delete()
            .eq("id", category_id)
            .execute()
        )
        return len(response.data) > 0

    # ==================== FAQS ====================

    def get_faqs(
        self,
        page: int = 1,
        page_size: int = 50,
        category_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        is_featured: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> Tuple[List[FAQ], int]:
        """Get paginated list of FAQs with optional filters."""
        query = self.client.table("faqs").select("*, faq_categories(*)", count="exact")

        # Apply filters
        if is_active is not None:
            query = query.eq("is_active", is_active)

        if category_id:
            query = query.eq("category_id", category_id)

        if is_featured is not None:
            query = query.eq("is_featured", is_featured)

        if search:
            query = query.or_(f"question.ilike.%{search}%,answer.ilike.%{search}%")

        # Get total count
        count_response = query.execute()
        total = count_response.count or 0

        # Apply pagination and ordering
        offset = (page - 1) * page_size
        query = self.client.table("faqs").select("*, faq_categories(*)", count="exact")

        # Re-apply filters for paginated query
        if is_active is not None:
            query = query.eq("is_active", is_active)
        if category_id:
            query = query.eq("category_id", category_id)
        if is_featured is not None:
            query = query.eq("is_featured", is_featured)
        if search:
            query = query.or_(f"question.ilike.%{search}%,answer.ilike.%{search}%")

        response = (
            query
            .order("display_order")
            .order("created_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        faqs = []
        for faq_data in response.data:
            category_data = faq_data.pop("faq_categories", None)
            faq = FAQ(**faq_data)
            if category_data:
                faq.category = FAQCategory(**category_data)
            faqs.append(faq)

        return faqs, total

    def get_public_faqs(
        self,
        category_slug: Optional[str] = None,
    ) -> List[FAQ]:
        """Get all active FAQs for public consumption."""
        query = (
            self.client.table("faqs")
            .select("*, faq_categories(*)")
            .eq("is_active", True)
        )

        if category_slug:
            # Get category ID first
            cat = self.get_category_by_slug(category_slug)
            if cat:
                query = query.eq("category_id", cat.id)

        response = query.order("display_order").order("created_at", desc=True).execute()

        faqs = []
        for faq_data in response.data:
            category_data = faq_data.pop("faq_categories", None)
            faq = FAQ(**faq_data)
            if category_data:
                faq.category = FAQCategory(**category_data)
            faqs.append(faq)

        return faqs

    def get_featured_faqs(self, limit: int = 5) -> List[FAQ]:
        """Get featured active FAQs."""
        response = (
            self.client.table("faqs")
            .select("*, faq_categories(*)")
            .eq("is_active", True)
            .eq("is_featured", True)
            .order("display_order")
            .limit(limit)
            .execute()
        )

        faqs = []
        for faq_data in response.data:
            category_data = faq_data.pop("faq_categories", None)
            faq = FAQ(**faq_data)
            if category_data:
                faq.category = FAQCategory(**category_data)
            faqs.append(faq)

        return faqs

    def get_faq_by_id(self, faq_id: str) -> Optional[FAQ]:
        """Get a FAQ by ID."""
        response = (
            self.client.table("faqs")
            .select("*, faq_categories(*)")
            .eq("id", faq_id)
            .single()
            .execute()
        )

        if not response.data:
            return None

        category_data = response.data.pop("faq_categories", None)
        faq = FAQ(**response.data)
        if category_data:
            faq.category = FAQCategory(**category_data)

        return faq

    def create_faq(self, faq: FAQCreate) -> FAQ:
        """Create a new FAQ."""
        data = faq.model_dump()
        response = self.client.table("faqs").insert(data).execute()
        return self.get_faq_by_id(response.data[0]["id"])

    def update_faq(self, faq_id: str, faq: FAQUpdate) -> Optional[FAQ]:
        """Update a FAQ."""
        data = faq.model_dump(exclude_unset=True)

        if not data:
            return self.get_faq_by_id(faq_id)

        response = (
            self.client.table("faqs")
            .update(data)
            .eq("id", faq_id)
            .execute()
        )

        return self.get_faq_by_id(faq_id) if response.data else None

    def delete_faq(self, faq_id: str) -> bool:
        """Delete a FAQ."""
        response = (
            self.client.table("faqs")
            .delete()
            .eq("id", faq_id)
            .execute()
        )
        return len(response.data) > 0

    def record_feedback(self, faq_id: str, helpful: bool) -> Optional[FAQ]:
        """Record user feedback for a FAQ."""
        faq = self.get_faq_by_id(faq_id)
        if not faq:
            return None

        update_data = {}
        if helpful:
            update_data["helpful_count"] = faq.helpful_count + 1
        else:
            update_data["not_helpful_count"] = faq.not_helpful_count + 1

        self.client.table("faqs").update(update_data).eq("id", faq_id).execute()
        return self.get_faq_by_id(faq_id)

    def increment_view_count(self, faq_id: str) -> None:
        """Increment view count for a FAQ."""
        faq = self.get_faq_by_id(faq_id)
        if faq:
            self.client.table("faqs").update(
                {"view_count": faq.view_count + 1}
            ).eq("id", faq_id).execute()

    def reorder_faqs(self, faq_orders: List[dict]) -> bool:
        """Reorder FAQs based on provided order mapping."""
        try:
            for item in faq_orders:
                self.client.table("faqs").update(
                    {"display_order": item["order"]}
                ).eq("id", item["id"]).execute()
            return True
        except Exception:
            return False

    def reorder_categories(self, category_orders: List[dict]) -> bool:
        """Reorder categories based on provided order mapping."""
        try:
            for item in category_orders:
                self.client.table("faq_categories").update(
                    {"display_order": item["order"]}
                ).eq("id", item["id"]).execute()
            return True
        except Exception:
            return False


# Singleton instance
_faq_service = None


def get_faq_service() -> FAQService:
    global _faq_service
    if _faq_service is None:
        _faq_service = FAQService()
    return _faq_service
