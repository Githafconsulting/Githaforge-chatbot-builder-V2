"""
Persona model for role-based chatbot prompt configurations
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


class PersonaBase(BaseModel):
    """Base persona model with common fields"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class PersonaCreate(PersonaBase):
    """Schema for creating a new persona.

    Note: system_prompt is NOT included here because it will be
    LLM-generated from the name and description.
    """
    pass


class PersonaUpdate(BaseModel):
    """Schema for updating persona settings.

    All fields are optional to allow partial updates.
    """
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    system_prompt: Optional[str] = Field(None, max_length=10000)


class PersonaRegenerateRequest(BaseModel):
    """Schema for regenerating a persona's prompt with additional context"""
    context: Optional[str] = Field(None, max_length=1000, description="Additional instructions for prompt regeneration")


class PersonaCloneRequest(BaseModel):
    """Schema for cloning a system persona to create an editable company copy"""
    new_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Optional new name for the cloned persona")


class SystemPersonaUpdate(BaseModel):
    """Schema for super admin updating system personas"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    system_prompt: Optional[str] = Field(None, max_length=10000)


class Persona(PersonaBase):
    """Full persona model with database fields"""
    id: UUID
    company_id: Optional[UUID] = None  # NULL for system personas
    system_prompt: str
    is_default: bool = False
    is_system: bool = False  # TRUE = global system persona, FALSE = company-specific
    default_prompt: Optional[str] = None
    prompt_history: List[PromptHistoryEntry] = Field(default_factory=list)
    regenerate_context: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PersonaList(BaseModel):
    """List of personas with total count"""
    personas: List[Persona]
    total: int


class PersonaWithChatbotCount(Persona):
    """Persona with count of chatbots using it"""
    chatbot_count: int = 0
