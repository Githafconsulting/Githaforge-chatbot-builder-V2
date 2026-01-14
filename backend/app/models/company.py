"""
Company model for multi-tenant support
"""
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
import re


class CompanyBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    website: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: str = Field(default="#1e40af", pattern=r'^#[0-9A-Fa-f]{6}$')
    secondary_color: str = Field(default="#0ea5e9", pattern=r'^#[0-9A-Fa-f]{6}$')
    company_size: Optional[str] = Field(None, pattern=r'^(1-10|11-50|51-200|201-500|500\+)$')
    industry: Optional[str] = Field(None, max_length=100)
    plan: str = Field(default="free", pattern=r'^(free|pro|enterprise)$')

    # Personal workspace flag - distinguishes individual accounts from company accounts
    # Individual accounts have: is_personal=True, max_team_members=1
    is_personal: bool = Field(default=False, description="True for individual/personal accounts")

    @validator('website')
    def validate_website(cls, v):
        if v and not re.match(r'https?://', v):
            v = f'https://{v}'
        return v

    @validator('company_size', 'industry', pre=True)
    def empty_string_to_none(cls, v):
        """Convert empty strings to None for optional fields"""
        if v == '':
            return None
        return v


class CompanyCreate(CompanyBase):
    """Schema for creating a new company during signup"""
    pass


class CompanyUpdate(BaseModel):
    """Schema for updating company settings"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    website: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    secondary_color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    company_size: Optional[str] = None
    industry: Optional[str] = None
    admin_can_access_billing: Optional[bool] = None


class Company(CompanyBase):
    """Company model with database fields"""
    id: str
    max_bots: int = 1
    max_documents: int = 50
    max_monthly_messages: int = 1000
    max_team_members: int = Field(default=5, description="Max team members (1 for personal accounts)")
    admin_can_access_billing: bool = False
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    # Stripe billing fields
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    subscription_status: Optional[str] = Field(default=None, description="Subscription status: active, past_due, canceled, trialing, ended")
    billing_email: Optional[str] = None
    subscription_current_period_start: Optional[datetime] = None
    subscription_current_period_end: Optional[datetime] = None
    trial_ends_at: Optional[datetime] = None

    # Billing address (synced from Stripe)
    billing_address_line1: Optional[str] = None
    billing_address_line2: Optional[str] = None
    billing_address_city: Optional[str] = None
    billing_address_state: Optional[str] = None
    billing_address_postal_code: Optional[str] = None
    billing_address_country: Optional[str] = None

    class Config:
        from_attributes = True


class CompanyStats(BaseModel):
    """Company statistics"""
    total_bots: int
    total_documents: int
    total_conversations: int
    total_messages: int
    avg_satisfaction: Optional[float]


class CompanyWithStats(Company):
    """Company with statistics"""
    stats: CompanyStats
