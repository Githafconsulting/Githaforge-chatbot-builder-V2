"""
Pydantic models for billing and Stripe integration
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class SubscriptionStatus(str, Enum):
    """Stripe subscription status values"""
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    TRIALING = "trialing"
    ENDED = "ended"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    UNPAID = "unpaid"


class InvoiceStatus(str, Enum):
    """Stripe invoice status values"""
    DRAFT = "draft"
    OPEN = "open"
    PAID = "paid"
    UNCOLLECTIBLE = "uncollectible"
    VOID = "void"


class PlanTier(str, Enum):
    """Available subscription plan tiers"""
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class SubscriptionEventType(str, Enum):
    """Types of subscription events for history tracking"""
    CREATED = "created"
    UPGRADED = "upgraded"
    DOWNGRADED = "downgraded"
    CANCELED = "canceled"
    REACTIVATED = "reactivated"
    TRIAL_ENDED = "trial_ended"
    PAYMENT_FAILED = "payment_failed"
    PAYMENT_SUCCEEDED = "payment_succeeded"


# ============================================================================
# PAYMENT METHOD MODELS
# ============================================================================

class PaymentMethodBase(BaseModel):
    """Base payment method model"""
    card_brand: Optional[str] = None
    card_last4: Optional[str] = None
    card_exp_month: Optional[int] = None
    card_exp_year: Optional[int] = None
    is_default: bool = False


class PaymentMethod(PaymentMethodBase):
    """Full payment method model"""
    id: str
    company_id: str
    stripe_payment_method_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaymentMethodCreate(BaseModel):
    """Model for adding a payment method via Stripe"""
    stripe_payment_method_id: str
    set_as_default: bool = True


# ============================================================================
# INVOICE MODELS
# ============================================================================

class InvoiceBase(BaseModel):
    """Base invoice model"""
    amount_due: int  # Amount in cents
    amount_paid: int = 0
    currency: str = "usd"
    status: InvoiceStatus
    invoice_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    paid_at: Optional[datetime] = None


class Invoice(InvoiceBase):
    """Full invoice model"""
    id: str
    company_id: str
    stripe_invoice_id: str
    invoice_pdf_url: Optional[str] = None
    hosted_invoice_url: Optional[str] = None
    subscription_id: Optional[str] = None
    billing_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    """Response model for invoice list"""
    invoices: List[Invoice]
    total: int
    has_more: bool = False


# ============================================================================
# SUBSCRIPTION MODELS
# ============================================================================

class SubscriptionInfo(BaseModel):
    """Current subscription information"""
    plan: PlanTier
    status: SubscriptionStatus
    stripe_subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    trial_ends_at: Optional[datetime] = None
    is_on_trial: bool = False


class SubscriptionHistory(BaseModel):
    """Subscription change history record"""
    id: str
    company_id: str
    event_type: SubscriptionEventType
    previous_plan: Optional[str] = None
    new_plan: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    stripe_event_id: Optional[str] = None
    metadata: dict = {}
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# USAGE MODELS
# ============================================================================

class UsageMetrics(BaseModel):
    """Current usage metrics"""
    messages_used: int = 0
    documents_used: int = 0
    chatbots_used: int = 0
    team_members_used: int = 0


class UsageLimits(BaseModel):
    """Plan usage limits"""
    messages_limit: int
    documents_limit: int
    chatbots_limit: int
    team_members_limit: int


class UsageRecord(BaseModel):
    """Monthly usage record"""
    id: str
    company_id: str
    billing_month: str  # Format: YYYY-MM
    messages_used: int = 0
    documents_used: int = 0
    chatbots_used: int = 0
    team_members_used: int = 0
    plan_at_time: Optional[str] = None
    messages_limit: Optional[int] = None
    documents_limit: Optional[int] = None
    chatbots_limit: Optional[int] = None
    team_members_limit: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UsageStatus(BaseModel):
    """Combined usage status with limits"""
    current: UsageMetrics
    limits: UsageLimits
    billing_month: str
    messages_percentage: float = 0.0
    documents_percentage: float = 0.0
    chatbots_percentage: float = 0.0
    team_members_percentage: float = 0.0
    is_over_limit: bool = False


# ============================================================================
# BILLING INFO MODELS
# ============================================================================

class BillingInfo(BaseModel):
    """Complete billing information for a company"""
    company_id: str
    company_name: str
    subscription: SubscriptionInfo
    payment_methods: List[PaymentMethod] = []
    default_payment_method: Optional[PaymentMethod] = None
    billing_email: Optional[str] = None
    usage: UsageStatus
    next_invoice_date: Optional[datetime] = None
    next_invoice_amount: Optional[int] = None  # Amount in cents


class BillingAddress(BaseModel):
    """Billing address for invoices"""
    line1: Optional[str] = None
    line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None


class BillingInfoUpdate(BaseModel):
    """Update billing information"""
    billing_email: Optional[str] = None
    billing_address: Optional[BillingAddress] = None


# ============================================================================
# CHECKOUT MODELS
# ============================================================================

class CheckoutSessionCreate(BaseModel):
    """Request to create a Stripe checkout session"""
    plan: PlanTier
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CheckoutSessionResponse(BaseModel):
    """Response with Stripe checkout session"""
    checkout_url: str
    session_id: str


class CustomerPortalResponse(BaseModel):
    """Response with Stripe customer portal URL"""
    portal_url: str


# ============================================================================
# UPGRADE/DOWNGRADE MODELS
# ============================================================================

class PlanChangeRequest(BaseModel):
    """Request to change subscription plan"""
    new_plan: PlanTier
    prorate: bool = True  # Whether to prorate the charge


class PlanChangeResponse(BaseModel):
    """Response after plan change"""
    success: bool
    message: str
    new_plan: PlanTier
    effective_date: datetime
    proration_amount: Optional[int] = None  # Amount in cents (negative for credit)


class CancelSubscriptionRequest(BaseModel):
    """Request to cancel subscription"""
    cancel_immediately: bool = False  # If False, cancel at period end
    feedback: Optional[str] = None


class CancelSubscriptionResponse(BaseModel):
    """Response after cancellation"""
    success: bool
    message: str
    cancel_at: Optional[datetime] = None
    effective_immediately: bool = False
    refund_amount: Optional[int] = None  # Refund amount in cents (if applicable)


# ============================================================================
# WEBHOOK MODELS
# ============================================================================

class WebhookEvent(BaseModel):
    """Stripe webhook event record"""
    id: str
    stripe_event_id: str
    event_type: str
    processed: bool = False
    processing_error: Optional[str] = None
    payload: dict = {}
    created_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# PLAN CONFIGURATION
# ============================================================================

# Plan pricing and limits configuration
PLAN_CONFIG = {
    PlanTier.FREE: {
        "price": 0,
        "messages_limit": 1000,
        "documents_limit": 1,
        "chatbots_limit": 1,
        "team_members_limit": 1,
        "features": [
            "1 Chatbot",
            "1,000 messages/month",
            "1 document",
            "Basic analytics",
            "Email support"
        ]
    },
    PlanTier.STARTER: {
        "price": 2500,  # $25.00 in cents
        "messages_limit": 5000,
        "documents_limit": 3,
        "chatbots_limit": 2,
        "team_members_limit": 2,
        "features": [
            "2 Chatbots",
            "5,000 messages/month",
            "3 documents",
            "Basic analytics",
            "Email support",
            "Custom branding"
        ]
    },
    PlanTier.PRO: {
        "price": 5000,  # $50.00 in cents
        "messages_limit": 15000,
        "documents_limit": 5,
        "chatbots_limit": 5,
        "team_members_limit": 5,
        "features": [
            "5 Chatbots",
            "15,000 messages/month",
            "5 documents",
            "Advanced analytics",
            "Priority support",
            "Custom branding",
            "API access"
        ]
    },
    PlanTier.ENTERPRISE: {
        "price": 10000,  # $100.00 in cents
        "messages_limit": 50000,
        "documents_limit": 10,
        "chatbots_limit": 15,
        "team_members_limit": 15,
        "features": [
            "15 Chatbots",
            "50,000 messages/month",
            "10 documents",
            "15 team members",
            "White-label solution",
            "Dedicated support",
            "Custom integrations",
            "SLA guarantee"
        ]
    }
}


def get_plan_limits(plan: PlanTier) -> UsageLimits:
    """Get usage limits for a plan tier"""
    config = PLAN_CONFIG.get(plan, PLAN_CONFIG[PlanTier.FREE])
    return UsageLimits(
        messages_limit=config["messages_limit"],
        documents_limit=config["documents_limit"],
        chatbots_limit=config["chatbots_limit"],
        team_members_limit=config["team_members_limit"]
    )


def is_unlimited(limit: int) -> bool:
    """Check if a limit value represents unlimited"""
    return limit == -1 or limit >= 999999
