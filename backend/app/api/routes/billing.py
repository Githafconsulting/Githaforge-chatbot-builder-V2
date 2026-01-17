"""
Billing API routes for Stripe payment integration
"""
import stripe
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from typing import Optional, List
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.multitenancy import verify_company_access
from app.services.billing_service import billing_service
from app.services.stripe_webhook_handler import webhook_handler
from app.models.billing import (
    PlanTier, InvoiceStatus,
    BillingInfo, BillingInfoUpdate,
    CheckoutSessionCreate, CheckoutSessionResponse, CustomerPortalResponse,
    PlanChangeRequest, PlanChangeResponse,
    CancelSubscriptionRequest, CancelSubscriptionResponse,
    PaymentMethodCreate, PaymentMethod,
    Invoice, InvoiceListResponse,
    SubscriptionInfo, SubscriptionHistory,
    UsageStatus
)
from app.utils.logger import logger

router = APIRouter()


# ============================================================================
# BILLING INFO ENDPOINTS
# ============================================================================

@router.get("/info", response_model=BillingInfo)
async def get_billing_info(
    current_user: dict = Depends(get_current_user)
):
    """
    Get complete billing information for the current user's company.

    Returns subscription status, payment methods, usage, and invoices.
    Only accessible by company owners or admins with billing access.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    # Verify billing access
    user_role = current_user.get("role", "member")
    admin_can_access = current_user.get("admin_can_access_billing", False)

    if user_role not in ["owner"] and not (user_role == "admin" and admin_can_access):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access billing information"
        )

    try:
        return await billing_service.get_billing_info(company_id)
    except Exception as e:
        logger.error(f"Error getting billing info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get billing information: {str(e)}"
        )


@router.put("/info", response_model=BillingInfo)
async def update_billing_info(
    update_data: BillingInfoUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Update billing information (email, address).

    Only accessible by company owners.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    if current_user.get("role") != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners can update billing information"
        )

    try:
        # Update billing email if provided
        if update_data.billing_email:
            from app.core.database import get_supabase_client
            client = get_supabase_client()
            client.table("companies").update({
                "billing_email": update_data.billing_email
            }).eq("id", company_id).execute()

        # TODO: Update billing address in Stripe

        return await billing_service.get_billing_info(company_id)
    except Exception as e:
        logger.error(f"Error updating billing info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update billing information: {str(e)}"
        )


# ============================================================================
# ACCOUNT CREDIT ENDPOINTS
# ============================================================================

@router.get("/credit")
async def get_account_credit(
    current_user: dict = Depends(get_current_user)
):
    """
    Get account credit balance from Stripe.

    Credits are accumulated from:
    - Unused time when downgrading plans
    - Manual adjustments by support

    Credits are automatically applied to future invoices.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    try:
        return await billing_service.get_account_credit(company_id)
    except Exception as e:
        logger.error(f"Error getting account credit: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get account credit: {str(e)}"
        )


# ============================================================================
# SUBSCRIPTION ENDPOINTS
# ============================================================================

@router.get("/subscription", response_model=SubscriptionInfo)
async def get_subscription(
    current_user: dict = Depends(get_current_user)
):
    """Get current subscription information."""
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    try:
        return await billing_service.get_subscription_info(company_id)
    except Exception as e:
        logger.error(f"Error getting subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get subscription: {str(e)}"
        )


@router.post("/checkout", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    checkout_data: CheckoutSessionCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a Stripe checkout session for subscribing to a plan.

    Returns a URL to redirect the user to Stripe's hosted checkout page.
    Only accessible by company owners.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    if current_user.get("role") != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners can manage subscriptions"
        )

    if checkout_data.plan == PlanTier.FREE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot checkout for free plan"
        )

    # Enterprise can also be purchased through Stripe checkout
    # (STRIPE_PRICE_ID_ENTERPRISE must be configured in .env)

    try:
        return await billing_service.create_checkout_session(
            company_id=company_id,
            plan=checkout_data.plan,
            success_url=checkout_data.success_url,
            cancel_url=checkout_data.cancel_url
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating checkout session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create checkout session: {str(e)}"
        )


@router.post("/portal", response_model=CustomerPortalResponse)
async def create_customer_portal_session(
    return_url: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a Stripe customer portal session.

    Returns a URL to redirect the user to Stripe's customer portal
    where they can manage their subscription and payment methods.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    try:
        return await billing_service.create_customer_portal_session(
            company_id=company_id,
            return_url=return_url
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating portal session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create portal session: {str(e)}"
        )


@router.post("/upgrade", response_model=PlanChangeResponse)
async def upgrade_subscription(
    plan_change: PlanChangeRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Upgrade or downgrade subscription plan.

    Changes will be prorated by default.
    Only accessible by company owners.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    if current_user.get("role") != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners can change subscription plans"
        )

    try:
        return await billing_service.update_subscription(
            company_id=company_id,
            new_plan=plan_change.new_plan,
            prorate=plan_change.prorate
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error upgrading subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upgrade subscription: {str(e)}"
        )


@router.get("/proration-preview")
async def get_proration_preview(
    new_plan: PlanTier,
    current_user: dict = Depends(get_current_user)
):
    """
    Get proration preview for a plan change.

    Returns the credit/charge amount that would apply if the user
    changes to the specified plan. Uses Stripe's Invoice.upcoming() API.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    try:
        return await billing_service.get_proration_preview(company_id, new_plan)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error getting proration preview: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get proration preview: {str(e)}"
        )


@router.post("/cancel", response_model=CancelSubscriptionResponse)
async def cancel_subscription(
    cancel_data: CancelSubscriptionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Cancel subscription.

    By default, cancels at the end of the current billing period.
    Set cancel_immediately=true to cancel immediately.
    Only accessible by company owners.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    if current_user.get("role") != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners can cancel subscriptions"
        )

    try:
        return await billing_service.cancel_subscription(
            company_id=company_id,
            cancel_immediately=cancel_data.cancel_immediately,
            feedback=cancel_data.feedback
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error canceling subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel subscription: {str(e)}"
        )


@router.post("/cancel-scheduled-downgrade")
async def cancel_scheduled_downgrade(
    current_user: dict = Depends(get_current_user)
):
    """
    Cancel a scheduled downgrade.

    If a downgrade was scheduled to take effect at the end of the billing period,
    this cancels that scheduled change and keeps the current plan.
    Only accessible by company owners.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    if current_user.get("role") != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners can manage subscriptions"
        )

    try:
        return await billing_service.cancel_scheduled_downgrade(company_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error canceling scheduled downgrade: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel scheduled downgrade: {str(e)}"
        )


# ============================================================================
# PAYMENT METHOD ENDPOINTS
# ============================================================================

@router.get("/payment-methods", response_model=List[PaymentMethod])
async def get_payment_methods(
    current_user: dict = Depends(get_current_user)
):
    """Get all payment methods for the company."""
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    try:
        return await billing_service.get_payment_methods(company_id)
    except Exception as e:
        logger.error(f"Error getting payment methods: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get payment methods: {str(e)}"
        )


@router.post("/payment-methods", response_model=PaymentMethod)
async def add_payment_method(
    payment_method_data: PaymentMethodCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Add a payment method using a Stripe PaymentMethod ID.

    The frontend should use Stripe.js to collect card details and create
    a PaymentMethod, then send the ID to this endpoint.
    Only accessible by company owners.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    if current_user.get("role") != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners can manage payment methods"
        )

    try:
        return await billing_service.add_payment_method(
            company_id=company_id,
            stripe_payment_method_id=payment_method_data.stripe_payment_method_id,
            set_as_default=payment_method_data.set_as_default
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error adding payment method: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add payment method: {str(e)}"
        )


@router.delete("/payment-methods/{payment_method_id}")
async def remove_payment_method(
    payment_method_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Remove a payment method.

    Only accessible by company owners.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    if current_user.get("role") != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners can manage payment methods"
        )

    try:
        await billing_service.remove_payment_method(company_id, payment_method_id)
        return {"success": True, "message": "Payment method removed"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error removing payment method: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove payment method: {str(e)}"
        )


# ============================================================================
# INVOICE ENDPOINTS
# ============================================================================

@router.get("/invoices", response_model=List[Invoice])
async def get_invoices(
    limit: int = 10,
    status_filter: Optional[InvoiceStatus] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get invoice history for the company."""
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    try:
        return await billing_service.get_invoices(
            company_id=company_id,
            limit=limit,
            status=status_filter
        )
    except Exception as e:
        logger.error(f"Error getting invoices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get invoices: {str(e)}"
        )


@router.post("/invoices/sync")
async def sync_invoices(
    current_user: dict = Depends(get_current_user)
):
    """
    Sync invoices from Stripe.

    Fetches all invoices from Stripe and updates the local database.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    try:
        synced_count = await billing_service.sync_invoices_from_stripe(company_id)
        return {"success": True, "synced": synced_count}
    except Exception as e:
        logger.error(f"Error syncing invoices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to sync invoices: {str(e)}"
        )


@router.post("/invoices/{invoice_id}/archive")
async def archive_invoice(
    invoice_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Archive an invoice.

    Archived invoices are hidden from the default view but can be accessed via filter.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    try:
        result = await billing_service.archive_invoice(company_id, invoice_id)
        return {"success": True, "message": "Invoice archived", "invoice": result}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error archiving invoice: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to archive invoice: {str(e)}"
        )


@router.post("/invoices/{invoice_id}/unarchive")
async def unarchive_invoice(
    invoice_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Unarchive an invoice.

    Restores an archived invoice back to the active view.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    try:
        result = await billing_service.unarchive_invoice(company_id, invoice_id)
        return {"success": True, "message": "Invoice unarchived", "invoice": result}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error unarchiving invoice: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unarchive invoice: {str(e)}"
        )


@router.post("/invoices/bulk-archive")
async def bulk_archive_invoices(
    invoice_ids: List[str],
    current_user: dict = Depends(get_current_user)
):
    """
    Archive multiple invoices at once.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    if not invoice_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No invoice IDs provided"
        )

    try:
        result = await billing_service.bulk_archive_invoices(company_id, invoice_ids)
        return {"success": True, "message": f"Archived {result['archived_count']} invoices", "details": result}
    except Exception as e:
        logger.error(f"Error bulk archiving invoices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to archive invoices: {str(e)}"
        )


@router.post("/invoices/bulk-unarchive")
async def bulk_unarchive_invoices(
    invoice_ids: List[str],
    current_user: dict = Depends(get_current_user)
):
    """
    Unarchive multiple invoices at once.
    """
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    if not invoice_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No invoice IDs provided"
        )

    try:
        result = await billing_service.bulk_unarchive_invoices(company_id, invoice_ids)
        return {"success": True, "message": f"Unarchived {result['unarchived_count']} invoices", "details": result}
    except Exception as e:
        logger.error(f"Error bulk unarchiving invoices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to unarchive invoices: {str(e)}"
        )


# ============================================================================
# USAGE ENDPOINTS
# ============================================================================

@router.get("/usage", response_model=UsageStatus)
async def get_usage(
    current_user: dict = Depends(get_current_user)
):
    """Get current usage status for the company."""
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not associated with a company"
        )

    try:
        return await billing_service.get_usage_status(company_id)
    except Exception as e:
        logger.error(f"Error getting usage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get usage: {str(e)}"
        )


# ============================================================================
# WEBHOOK ENDPOINT
# ============================================================================

@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature")
):
    """
    Handle Stripe webhook events.

    This endpoint should be configured in Stripe Dashboard to receive events.
    Events are verified using the webhook signing secret.
    """
    if not settings.STRIPE_WEBHOOK_SECRET:
        logger.error("Stripe webhook secret not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook not configured"
        )

    # Get raw body for signature verification
    payload = await request.body()

    try:
        # Verify webhook signature
        event = stripe.Webhook.construct_event(
            payload,
            stripe_signature,
            settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        logger.error(f"Invalid webhook payload: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload"
        )
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid webhook signature: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature"
        )

    try:
        # Process the event
        await webhook_handler.handle_event(event)
        return {"received": True}
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        # Return 200 to prevent Stripe from retrying
        # The error is logged and stored for later investigation
        return {"received": True, "error": str(e)}


# ============================================================================
# STRIPE CONFIG ENDPOINT (for frontend)
# ============================================================================

@router.get("/config")
async def get_stripe_config():
    """
    Get Stripe publishable key for frontend initialization.

    This endpoint is public and returns the publishable key that
    can be safely exposed in the frontend.
    """
    if not settings.STRIPE_PUBLISHABLE_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Stripe not configured"
        )

    return {
        "publishable_key": settings.STRIPE_PUBLISHABLE_KEY
    }
