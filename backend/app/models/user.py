"""
User and authentication Pydantic models
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID


class User(BaseModel):
    """User database model"""
    id: UUID
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False
    company_id: Optional[UUID] = None  # Multi-tenant support
    role: Optional[str] = "member"  # owner, admin, member
    created_at: datetime


class UserCreate(BaseModel):
    """Model for user creation"""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None
    is_admin: bool = False


class UserLogin(BaseModel):
    """Model for user login"""
    username: str = Field(..., description="Email address for login")
    password: str


class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data"""
    sub: str = Field(..., description="Subject (user ID)")
    company_id: Optional[str] = Field(None, description="Company ID for multi-tenant RLS")
    role: Optional[str] = Field(None, description="User role (owner, admin, member)")
    exp: Optional[datetime] = None


class CompanySignup(BaseModel):
    """Model for company signup (creates company + owner user)"""
    company_name: str = Field(..., min_length=2, max_length=100, description="Company name")
    email: EmailStr = Field(..., description="Owner email address")
    password: str = Field(..., min_length=8, description="Owner password")
    full_name: str = Field(..., min_length=2, description="Owner full name")
    website: Optional[str] = Field(None, description="Company website URL")
    industry: Optional[str] = Field(None, description="Company industry")
    company_size: Optional[str] = Field(None, description="Company size (1-10, 11-50, etc.)")


class UnifiedSignup(BaseModel):
    """
    Unified signup model supporting both company and individual accounts.

    For individual accounts:
    - Creates a personal workspace (company with is_personal=true)
    - Limited to 1 team member (the owner)
    - Can convert to company account later

    For company accounts:
    - Creates standard company workspace
    - Can invite team members
    - Full multi-tenant features
    """
    account_type: str = Field(..., pattern=r'^(company|individual)$', description="Account type: 'company' or 'individual'")
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password (minimum 8 characters)")
    full_name: str = Field(..., min_length=2, description="User full name")

    # Company-specific fields (required for company, optional for individual)
    company_name: Optional[str] = Field(None, min_length=2, max_length=100, description="Company name (required for company accounts)")
    website: Optional[str] = Field(None, description="Company website URL")
    industry: Optional[str] = Field(None, description="Industry sector")
    company_size: Optional[str] = Field(None, pattern=r'^(1-10|11-50|51-200|201-500|500\+)$', description="Company size")

    # Subscription tier from pricing page
    subscription_tier: Optional[str] = Field("free", pattern=r'^(free|pro|enterprise)$', description="Subscription tier")


class SignupResponse(BaseModel):
    """Response after successful company signup"""
    access_token: str
    token_type: str = "bearer"
    company_id: UUID
    user_id: UUID
    message: str = "Company registration successful"
