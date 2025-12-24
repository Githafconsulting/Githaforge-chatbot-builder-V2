from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class BlogStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class BlogCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    color: str = Field(default="#a855f7", max_length=7)


class BlogCategoryCreate(BlogCategoryBase):
    pass


class BlogCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    slug: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, max_length=7)


class BlogCategory(BlogCategoryBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BlogBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)
    excerpt: Optional[str] = None
    content: str = Field(..., min_length=1)
    featured_image_url: Optional[str] = None
    featured_image_alt: Optional[str] = Field(None, max_length=255)
    meta_title: Optional[str] = Field(None, max_length=70)
    meta_description: Optional[str] = Field(None, max_length=160)
    meta_keywords: Optional[List[str]] = None
    canonical_url: Optional[str] = None
    category_id: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)
    author_name: Optional[str] = Field(None, max_length=255)
    author_avatar_url: Optional[str] = None
    status: BlogStatus = BlogStatus.DRAFT
    is_featured: bool = False
    allow_comments: bool = True
    read_time_minutes: int = Field(default=5, ge=1)


class BlogCreate(BlogBase):
    pass


class BlogUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = Field(None, min_length=1, max_length=255)
    excerpt: Optional[str] = None
    content: Optional[str] = None
    featured_image_url: Optional[str] = None
    featured_image_alt: Optional[str] = Field(None, max_length=255)
    meta_title: Optional[str] = Field(None, max_length=70)
    meta_description: Optional[str] = Field(None, max_length=160)
    meta_keywords: Optional[List[str]] = None
    canonical_url: Optional[str] = None
    category_id: Optional[str] = None
    tags: Optional[List[str]] = None
    author_name: Optional[str] = Field(None, max_length=255)
    author_avatar_url: Optional[str] = None
    status: Optional[BlogStatus] = None
    is_featured: Optional[bool] = None
    allow_comments: Optional[bool] = None
    read_time_minutes: Optional[int] = Field(None, ge=1)


class Blog(BlogBase):
    id: str
    author_id: Optional[str] = None
    published_at: Optional[datetime] = None
    view_count: int = 0
    created_at: datetime
    updated_at: datetime
    category: Optional[BlogCategory] = None

    class Config:
        from_attributes = True


class BlogListResponse(BaseModel):
    blogs: List[Blog]
    total: int
    page: int
    page_size: int
    total_pages: int


class BlogPublishRequest(BaseModel):
    publish: bool = True
