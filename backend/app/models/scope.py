"""
Scope model for role-based chatbot prompt configurations
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Union
from datetime import datetime
from uuid import UUID


class PromptHistoryEntry(BaseModel):
    """Entry in the prompt history for restore functionality"""
    prompt: str
    saved_at: Union[datetime, str]  # Accept both datetime and ISO string
    saved_by: Optional[str] = None  # user_id who made the change

    @validator('saved_at', pre=True)
    def parse_saved_at(cls, v):
        """Ensure saved_at is always a string for JSON serialization"""
        if isinstance(v, datetime):
            return v.isoformat()
        return v


class ScopeBase(BaseModel):
    """Base scope model with common fields"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class ScopeCreate(ScopeBase):
    """Schema for creating a new scope.

    Note: system_prompt is NOT included here because it will be
    LLM-generated from the name and description.
    """
    pass


class ScopeUpdate(BaseModel):
    """Schema for updating scope settings.

    All fields are optional to allow partial updates.
    """
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    system_prompt: Optional[str] = Field(None, max_length=10000)


class ScopeRegenerateRequest(BaseModel):
    """Schema for regenerating a scope's prompt with additional context"""
    context: Optional[str] = Field(None, max_length=1000, description="Additional instructions for prompt regeneration")


class Scope(ScopeBase):
    """Full scope model with database fields"""
    id: UUID
    company_id: UUID
    system_prompt: str
    is_default: bool = False
    default_prompt: Optional[str] = None
    prompt_history: List[PromptHistoryEntry] = Field(default_factory=list)
    regenerate_context: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ScopeList(BaseModel):
    """List of scopes with total count"""
    scopes: List[Scope]
    total: int


class ScopeWithChatbotCount(Scope):
    """Scope with count of chatbots using it"""
    chatbot_count: int = 0
