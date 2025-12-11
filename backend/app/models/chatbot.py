"""
Chatbot model for multi-tenant support
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime


class ChatbotBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    greeting_message: str = Field(default="Hi! How can I help you today?", max_length=200)

    # Branding (optional - uses company defaults if not set)
    primary_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    secondary_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    logo_url: Optional[str] = None

    # Configuration
    model_preset: str = Field(default="balanced", pattern=r'^(fast|balanced|accurate)$')
    temperature: float = Field(default=0.7, ge=0.0, le=1.0)
    max_tokens: int = Field(default=500, ge=100, le=2000)
    top_k: int = Field(default=5, ge=1, le=20)
    similarity_threshold: float = Field(default=0.5, ge=0.0, le=1.0)

    # Response Style
    response_style: str = Field(default="standard", pattern=r'^(concise|standard|detailed)$')

    # Access Control
    allowed_domains: Optional[List[str]] = Field(default_factory=list)
    rate_limit_per_ip: int = Field(default=10, ge=1, le=100)

    @validator('allowed_domains', pre=True, always=True)
    def set_allowed_domains(cls, v):
        return v if v is not None else []


class ChatbotCreate(ChatbotBase):
    """Schema for creating a new chatbot"""
    company_id: Optional[str] = Field(default=None)  # Auto-injected from JWT context, frontend shouldn't send this


class ChatbotUpdate(BaseModel):
    """Schema for updating chatbot settings"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    greeting_message: Optional[str] = Field(None, max_length=200)
    paused_message: Optional[str] = Field(None, max_length=500)  # Message shown when paused
    primary_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    secondary_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    logo_url: Optional[str] = None

    # Persona and KB Mode
    persona_id: Optional[str] = None  # UUID of assigned persona
    use_shared_kb: Optional[bool] = None  # True = shared KB, False = selected docs only
    selected_document_ids: Optional[List[str]] = None  # Doc IDs when use_shared_kb=False

    # Custom Contact Details
    enable_custom_contact: Optional[bool] = None  # Toggle for custom contact info
    contact_phone: Optional[str] = Field(None, max_length=50)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_address: Optional[str] = None
    contact_hours: Optional[str] = None  # e.g., "Mon-Fri 9AM-5PM"

    # Widget Appearance
    widget_theme: Optional[str] = Field(None, pattern=r'^(modern|minimal|classic)$')
    widget_position: Optional[str] = Field(None, pattern=r'^(bottom-right|bottom-left|top-right|top-left)$')
    button_size: Optional[str] = Field(None, pattern=r'^(small|medium|large)$')
    show_notification_badge: Optional[bool] = None
    widget_title: Optional[str] = Field(None, max_length=100)
    widget_subtitle: Optional[str] = Field(None, max_length=100)
    padding_x: Optional[int] = Field(None, ge=0, le=200)
    padding_y: Optional[int] = Field(None, ge=0, le=200)
    z_index: Optional[int] = Field(None, ge=0, le=99999)

    model_preset: Optional[str] = Field(None, pattern=r'^(fast|balanced|accurate)$')
    temperature: Optional[float] = Field(None, ge=0.0, le=1.0)
    max_tokens: Optional[int] = Field(None, ge=100, le=2000)
    top_k: Optional[int] = Field(None, ge=1, le=20)
    similarity_threshold: Optional[float] = Field(None, ge=0.0, le=1.0)
    allowed_domains: Optional[List[str]] = None
    rate_limit_per_ip: Optional[int] = Field(None, ge=1, le=100)

    # Response Style
    response_style: Optional[str] = Field(None, pattern=r'^(concise|standard|detailed)$')

    # Visibility
    is_active: Optional[bool] = None  # Hide/show chatbot on website


class Chatbot(ChatbotBase):
    """Chatbot model with database fields"""
    id: str
    company_id: str
    is_active: bool = True
    deploy_status: str = "draft"  # draft, deployed, paused
    paused_message: str = "This chatbot is currently unavailable. Please try again later or contact support."

    # Persona and KB Mode
    persona_id: Optional[str] = None  # UUID of assigned persona
    use_shared_kb: bool = True  # True = shared KB, False = selected docs only
    selected_document_ids: Optional[List[str]] = None  # Doc IDs when use_shared_kb=False

    # Widget Appearance (stored in DB)
    widget_theme: Optional[str] = "modern"
    widget_position: Optional[str] = "bottom-right"
    button_size: Optional[str] = "medium"
    show_notification_badge: Optional[bool] = True
    widget_title: Optional[str] = None
    widget_subtitle: Optional[str] = None
    padding_x: Optional[int] = 20
    padding_y: Optional[int] = 20
    z_index: Optional[int] = 9999

    # Custom Contact Details
    enable_custom_contact: bool = False
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    contact_address: Optional[str] = None
    contact_hours: Optional[str] = None

    # Response Style (overrides base default if set in DB)
    response_style: str = "standard"

    # Metrics
    total_conversations: int = 0
    total_messages: int = 0
    avg_satisfaction: Optional[float] = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChatbotWithEmbedCode(Chatbot):
    """Chatbot with generated embed code"""
    embed_code: str


class ChatbotDeploy(BaseModel):
    """Schema for deploying/pausing a chatbot"""
    deploy_status: str = Field(..., pattern=r'^(deployed|paused)$')


class ChatbotStats(BaseModel):
    """Detailed chatbot statistics"""
    total_conversations: int
    total_messages: int
    avg_satisfaction: Optional[float]
    avg_response_time: Optional[float]
    satisfaction_rate: Optional[float]
    response_rate: Optional[float]
    top_queries: List[dict]
    daily_stats: List[dict]
