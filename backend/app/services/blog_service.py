from typing import Optional, List, Tuple
from datetime import datetime
import re
import math

from app.core.database import get_supabase_client
from app.models.blog import (
    BlogCreate,
    BlogUpdate,
    Blog,
    BlogCategory,
    BlogCategoryCreate,
    BlogCategoryUpdate,
    BlogStatus,
)


def generate_slug(title: str) -> str:
    """Generate a URL-friendly slug from a title."""
    slug = title.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    return slug


def calculate_read_time(content: str) -> int:
    """Calculate estimated read time in minutes based on word count."""
    words = len(content.split())
    minutes = max(1, round(words / 200))  # Average reading speed: 200 words/min
    return minutes


class BlogService:
    def __init__(self):
        self.client = get_supabase_client()

    # ==================== CATEGORIES ====================

    def get_categories(self) -> List[BlogCategory]:
        """Get all blog categories."""
        response = self.client.table("blog_categories").select("*").order("name").execute()
        return [BlogCategory(**cat) for cat in response.data]

    def get_category_by_id(self, category_id: str) -> Optional[BlogCategory]:
        """Get a category by ID."""
        response = (
            self.client.table("blog_categories")
            .select("*")
            .eq("id", category_id)
            .single()
            .execute()
        )
        return BlogCategory(**response.data) if response.data else None

    def get_category_by_slug(self, slug: str) -> Optional[BlogCategory]:
        """Get a category by slug."""
        response = (
            self.client.table("blog_categories")
            .select("*")
            .eq("slug", slug)
            .single()
            .execute()
        )
        return BlogCategory(**response.data) if response.data else None

    def create_category(self, category: BlogCategoryCreate) -> BlogCategory:
        """Create a new category."""
        data = category.model_dump()
        response = self.client.table("blog_categories").insert(data).execute()
        return BlogCategory(**response.data[0])

    def update_category(self, category_id: str, category: BlogCategoryUpdate) -> Optional[BlogCategory]:
        """Update a category."""
        data = category.model_dump(exclude_unset=True)
        if not data:
            return self.get_category_by_id(category_id)

        response = (
            self.client.table("blog_categories")
            .update(data)
            .eq("id", category_id)
            .execute()
        )
        return BlogCategory(**response.data[0]) if response.data else None

    def delete_category(self, category_id: str) -> bool:
        """Delete a category."""
        response = (
            self.client.table("blog_categories")
            .delete()
            .eq("id", category_id)
            .execute()
        )
        return len(response.data) > 0

    # ==================== BLOGS ====================

    def get_blogs(
        self,
        page: int = 1,
        page_size: int = 10,
        status: Optional[BlogStatus] = None,
        category_slug: Optional[str] = None,
        tag: Optional[str] = None,
        featured_only: bool = False,
        search: Optional[str] = None,
    ) -> Tuple[List[Blog], int]:
        """Get paginated list of blogs with optional filters."""
        query = self.client.table("blogs").select("*, blog_categories(*)", count="exact")

        # Apply filters
        if status:
            query = query.eq("status", status.value)

        if category_slug:
            # Get category ID first
            cat = self.get_category_by_slug(category_slug)
            if cat:
                query = query.eq("category_id", cat.id)

        if tag:
            query = query.contains("tags", [tag])

        if featured_only:
            query = query.eq("is_featured", True)

        if search:
            query = query.or_(f"title.ilike.%{search}%,excerpt.ilike.%{search}%")

        # Get total count
        count_response = query.execute()
        total = count_response.count or 0

        # Apply pagination and ordering
        offset = (page - 1) * page_size
        query = (
            self.client.table("blogs")
            .select("*, blog_categories(*)", count="exact")
        )

        # Re-apply filters for paginated query
        if status:
            query = query.eq("status", status.value)
        if category_slug:
            cat = self.get_category_by_slug(category_slug)
            if cat:
                query = query.eq("category_id", cat.id)
        if tag:
            query = query.contains("tags", [tag])
        if featured_only:
            query = query.eq("is_featured", True)
        if search:
            query = query.or_(f"title.ilike.%{search}%,excerpt.ilike.%{search}%")

        response = (
            query
            .order("published_at", desc=True)
            .order("created_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        blogs = []
        for blog_data in response.data:
            category_data = blog_data.pop("blog_categories", None)
            blog = Blog(**blog_data)
            if category_data:
                blog.category = BlogCategory(**category_data)
            blogs.append(blog)

        return blogs, total

    def get_public_blogs(
        self,
        page: int = 1,
        page_size: int = 10,
        category_slug: Optional[str] = None,
        tag: Optional[str] = None,
        featured_only: bool = False,
        search: Optional[str] = None,
    ) -> Tuple[List[Blog], int]:
        """Get published blogs for public consumption."""
        return self.get_blogs(
            page=page,
            page_size=page_size,
            status=BlogStatus.PUBLISHED,
            category_slug=category_slug,
            tag=tag,
            featured_only=featured_only,
            search=search,
        )

    def get_featured_blogs(self, limit: int = 2) -> List[Blog]:
        """Get featured published blogs."""
        response = (
            self.client.table("blogs")
            .select("*, blog_categories(*)")
            .eq("status", "published")
            .eq("is_featured", True)
            .order("published_at", desc=True)
            .limit(limit)
            .execute()
        )

        blogs = []
        for blog_data in response.data:
            category_data = blog_data.pop("blog_categories", None)
            blog = Blog(**blog_data)
            if category_data:
                blog.category = BlogCategory(**category_data)
            blogs.append(blog)

        return blogs

    def get_recent_blogs(self, limit: int = 6, exclude_featured: bool = True) -> List[Blog]:
        """Get recent published blogs."""
        query = (
            self.client.table("blogs")
            .select("*, blog_categories(*)")
            .eq("status", "published")
            .order("published_at", desc=True)
        )

        if exclude_featured:
            query = query.eq("is_featured", False)

        response = query.limit(limit).execute()

        blogs = []
        for blog_data in response.data:
            category_data = blog_data.pop("blog_categories", None)
            blog = Blog(**blog_data)
            if category_data:
                blog.category = BlogCategory(**category_data)
            blogs.append(blog)

        return blogs

    def get_blog_by_id(self, blog_id: str) -> Optional[Blog]:
        """Get a blog by ID."""
        response = (
            self.client.table("blogs")
            .select("*, blog_categories(*)")
            .eq("id", blog_id)
            .single()
            .execute()
        )

        if not response.data:
            return None

        category_data = response.data.pop("blog_categories", None)
        blog = Blog(**response.data)
        if category_data:
            blog.category = BlogCategory(**category_data)

        return blog

    def get_blog_by_slug(self, slug: str, increment_views: bool = False) -> Optional[Blog]:
        """Get a blog by slug."""
        response = (
            self.client.table("blogs")
            .select("*, blog_categories(*)")
            .eq("slug", slug)
            .single()
            .execute()
        )

        if not response.data:
            return None

        category_data = response.data.pop("blog_categories", None)
        blog = Blog(**response.data)
        if category_data:
            blog.category = BlogCategory(**category_data)

        # Increment view count
        if increment_views:
            self.client.table("blogs").update(
                {"view_count": blog.view_count + 1}
            ).eq("id", blog.id).execute()
            blog.view_count += 1

        return blog

    def create_blog(self, blog: BlogCreate, author_id: Optional[str] = None) -> Blog:
        """Create a new blog post."""
        data = blog.model_dump()

        # Auto-generate slug if not provided
        if not data.get("slug"):
            data["slug"] = generate_slug(data["title"])

        # Calculate read time
        data["read_time_minutes"] = calculate_read_time(data.get("content", ""))

        # Set author
        if author_id:
            data["author_id"] = author_id

        # Set published_at if publishing
        if data.get("status") == BlogStatus.PUBLISHED.value:
            data["published_at"] = datetime.utcnow().isoformat()

        response = self.client.table("blogs").insert(data).execute()
        return self.get_blog_by_id(response.data[0]["id"])

    def update_blog(self, blog_id: str, blog: BlogUpdate) -> Optional[Blog]:
        """Update a blog post."""
        data = blog.model_dump(exclude_unset=True)

        if not data:
            return self.get_blog_by_id(blog_id)

        # Recalculate read time if content changed
        if "content" in data:
            data["read_time_minutes"] = calculate_read_time(data["content"])

        # Update slug if title changed and slug not explicitly set
        if "title" in data and "slug" not in data:
            data["slug"] = generate_slug(data["title"])

        response = (
            self.client.table("blogs")
            .update(data)
            .eq("id", blog_id)
            .execute()
        )

        return self.get_blog_by_id(blog_id) if response.data else None

    def publish_blog(self, blog_id: str, publish: bool = True) -> Optional[Blog]:
        """Publish or unpublish a blog post."""
        data = {
            "status": BlogStatus.PUBLISHED.value if publish else BlogStatus.DRAFT.value,
        }

        if publish:
            data["published_at"] = datetime.utcnow().isoformat()

        response = (
            self.client.table("blogs")
            .update(data)
            .eq("id", blog_id)
            .execute()
        )

        return self.get_blog_by_id(blog_id) if response.data else None

    def delete_blog(self, blog_id: str) -> bool:
        """Delete a blog post."""
        response = (
            self.client.table("blogs")
            .delete()
            .eq("id", blog_id)
            .execute()
        )
        return len(response.data) > 0

    def get_all_tags(self) -> List[str]:
        """Get all unique tags from published blogs."""
        response = (
            self.client.table("blogs")
            .select("tags")
            .eq("status", "published")
            .execute()
        )

        all_tags = set()
        for blog in response.data:
            if blog.get("tags"):
                all_tags.update(blog["tags"])

        return sorted(list(all_tags))

    def get_related_blogs(self, blog_id: str, limit: int = 3) -> List[Blog]:
        """Get related blogs based on category and tags."""
        blog = self.get_blog_by_id(blog_id)
        if not blog:
            return []

        # Get blogs in same category
        query = (
            self.client.table("blogs")
            .select("*, blog_categories(*)")
            .eq("status", "published")
            .neq("id", blog_id)
        )

        if blog.category_id:
            query = query.eq("category_id", blog.category_id)

        response = query.order("published_at", desc=True).limit(limit).execute()

        blogs = []
        for blog_data in response.data:
            category_data = blog_data.pop("blog_categories", None)
            related_blog = Blog(**blog_data)
            if category_data:
                related_blog.category = BlogCategory(**category_data)
            blogs.append(related_blog)

        return blogs


# Singleton instance
_blog_service = None


def get_blog_service() -> BlogService:
    global _blog_service
    if _blog_service is None:
        _blog_service = BlogService()
    return _blog_service
