from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class FAQCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    icon: str = Field(default="help-circle", max_length=50)
    display_order: int = Field(default=0)
    is_active: bool = Field(default=True)


class FAQCategoryCreate(FAQCategoryBase):
    pass


class FAQCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    slug: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = Field(None, max_length=50)
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class FAQCategory(FAQCategoryBase):
    id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FAQBase(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    answer: str = Field(..., min_length=1)
    category_id: Optional[str] = None
    display_order: int = Field(default=0)
    is_featured: bool = Field(default=False)
    is_active: bool = Field(default=True)


class FAQCreate(FAQBase):
    pass


class FAQUpdate(BaseModel):
    question: Optional[str] = Field(None, min_length=1, max_length=500)
    answer: Optional[str] = None
    category_id: Optional[str] = None
    display_order: Optional[int] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None


class FAQ(FAQBase):
    id: str
    view_count: int = 0
    helpful_count: int = 0
    not_helpful_count: int = 0
    created_at: datetime
    updated_at: datetime
    category: Optional[FAQCategory] = None

    class Config:
        from_attributes = True


class FAQListResponse(BaseModel):
    faqs: List[FAQ]
    total: int
    page: int
    page_size: int
    total_pages: int


class FAQFeedbackRequest(BaseModel):
    helpful: bool
