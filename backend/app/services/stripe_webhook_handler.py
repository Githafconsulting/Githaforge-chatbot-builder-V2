"""
Stripe webhook event handler
"""
import stripe
from datetime import datetime
from typing import Optional
from app.core.config import settings
from app.core.database import get_supabase_client
from app.models.billing import (
    PlanTier, SubscriptionStatus, SubscriptionEventType, PLAN_CONFIG
)
from app.utils.logger import logger

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class StripeWebhookHandler:
    """Handles Stripe webhook events"""

    def __init__(self):
        self.client = get_supabase_client()

    async def handle_event(self, event: stripe.Event) -> bool:
        """
        Process a Stripe webhook event.
        Returns True if processed successfully, False otherwise.
        """
        event_type = event.type
        event_id = event.id

        # Check if already processed (idempotency)
        if await self._is_event_processed(event_id):
            logger.info(f"Webhook event {event_id} already processed, skipping")
            return True

        # Record event as being processed
        await self._record_event(event_id, event_type, event.data.object)

        try:
            # Route to appropriate handler
            handler_map = {
                "customer.subscription.created": self._handle_subscription_created,
                "customer.subscription.updated": self._handle_subscription_updated,
                "customer.subscription.deleted": self._handle_subscription_deleted,
                "invoice.payment_succeeded": self._handle_payment_succeeded,
                "invoice.payment_failed": self._handle_payment_failed,
                "invoice.paid": self._handle_invoice_paid,
                "customer.updated": self._handle_customer_updated,
                "payment_method.attached": self._handle_payment_method_attached,
                "payment_method.detached": self._handle_payment_method_detached,
                "checkout.session.completed": self._handle_checkout_completed,
                "subscription_schedule.completed": self._handle_schedule_completed,
                "subscription_schedule.released": self._handle_schedule_released,
            }

            handler = handler_map.get(event_type)
            if handler:
                await handler(event.data.object)
                logger.info(f"Successfully processed webhook event: {event_type}")
            else:
                logger.debug(f"Unhandled webhook event type: {event_type}")

            # Mark as processed
            await self._mark_event_processed(event_id)
            return True

        except Exception as e:
            logger.error(f"Error processing webhook event {event_id}: {e}")
            await self._mark_event_failed(event_id, str(e))
            raise

    # ========================================================================
    # SUBSCRIPTION HANDLERS
    # ========================================================================

    async def _handle_subscription_created(self, subscription: dict):
        """Handle new subscription creation"""
        company_id = subscription.get("metadata", {}).get("company_id")
        if not company_id:
            # Try to find company by customer ID
            customer_id = subscription.get("customer")
            if customer_id:
                company_id = await self._get_company_by_customer(customer_id)

        if not company_id:
            logger.warning(f"No company found for subscription {subscription.get('id', 'unknown')}")
            return

        plan = subscription.get("metadata", {}).get("plan", "pro")
        plan_limits = PLAN_CONFIG.get(PlanTier(plan), PLAN_CONFIG[PlanTier.PRO])

        # Build update data - handle optional period fields
        update_data = {
            "stripe_subscription_id": subscription.get("id"),
            "subscription_status": subscription.get("status", "active"),
            "plan": plan,
            "max_bots": plan_limits["chatbots_limit"],
            "max_documents": plan_limits["documents_limit"],
            "max_monthly_messages": plan_limits["messages_limit"],
            "max_team_members": plan_limits["team_members_limit"],
            "trial_ends_at": None  # Clear trial when subscription starts
        }

        # Add period dates if available (check subscription items first, then top-level)
        period_start = subscription.get("current_period_start")
        period_end = subscription.get("current_period_end")

        # In newer Stripe API versions, period is on subscription items
        if not period_start or not period_end:
            items = subscription.get("items", {})
            items_data = items.get("data") if isinstance(items, dict) else None
            if items_data and len(items_data) > 0:
                period_start = items_data[0].get("current_period_start")
                period_end = items_data[0].get("current_period_end")

        if period_start:
            update_data["subscription_current_period_start"] = datetime.fromtimestamp(period_start).isoformat()
        if period_end:
            update_data["subscription_current_period_end"] = datetime.fromtimestamp(period_end).isoformat()

        # Update company
        self.client.table("companies").update(update_data).eq("id", company_id).execute()

        # Record event
        await self._record_subscription_history(
            company_id=company_id,
            event_type=SubscriptionEventType.CREATED,
            new_plan=plan,
            stripe_subscription_id=subscription.get("id")
        )

        logger.info(f"Subscription created for company {company_id}: {plan}")

    async def _handle_subscription_updated(self, subscription: dict):
        """Handle subscription updates (plan changes, renewals)"""
        subscription_id = subscription.get("id")
        company_id = subscription.get("metadata", {}).get("company_id")
        if not company_id and subscription_id:
            company_id = await self._get_company_by_subscription(subscription_id)

        if not company_id:
            logger.warning(f"No company found for subscription {subscription_id}")
            return

        # Get current company data for comparison
        company = await self._get_company(company_id)
        previous_plan = company.get("plan") if company else None

        # Determine new plan from subscription
        # IMPORTANT: Always prioritize price_id over metadata because metadata can be stale
        # (e.g., when using pending_if_incomplete for upgrades, metadata cannot be updated)
        new_plan = None
        items = subscription.get("items", {})
        items_data = items.get("data") if isinstance(items, dict) else None

        # First, try to determine from price_id (most reliable source of truth)
        if items_data and len(items_data) > 0:
            try:
                price_id = items_data[0]["price"]["id"]
                logger.info(f"Webhook - determining plan from price_id: {price_id}")
                new_plan = self._get_plan_from_price_id(price_id)
                logger.info(f"Webhook - plan from price_id: {new_plan}")
            except (KeyError, IndexError, TypeError) as e:
                logger.warning(f"Webhook - failed to get plan from price: {e}")

        # Fall back to metadata only if price_id lookup failed
        if not new_plan:
            metadata_plan = subscription.get("metadata", {}).get("plan")
            logger.info(f"Webhook - falling back to metadata plan: {metadata_plan}")
            new_plan = metadata_plan

        # Final fallback to previous plan
        if not new_plan:
            new_plan = previous_plan or "pro"
            logger.info(f"Webhook - using final fallback plan: {new_plan}")

        plan_limits = PLAN_CONFIG.get(PlanTier(new_plan), PLAN_CONFIG[PlanTier.PRO])

        # Build update data - handle optional period fields
        update_data = {
            "subscription_status": subscription.get("status", "active"),
        }

        # Add period dates if available (check subscription items first, then top-level)
        period_start = subscription.get("current_period_start")
        period_end = subscription.get("current_period_end")

        # In newer Stripe API versions, period is on subscription items
        if not period_start or not period_end:
            if items_data and len(items_data) > 0:
                period_start = items_data[0].get("current_period_start")
                period_end = items_data[0].get("current_period_end")

        if period_start:
            update_data["subscription_current_period_start"] = datetime.fromtimestamp(period_start).isoformat()
        if period_end:
            update_data["subscription_current_period_end"] = datetime.fromtimestamp(period_end).isoformat()

        # Only update plan info if plan changed
        if new_plan != previous_plan:
            update_data.update({
                "plan": new_plan,
                "max_bots": plan_limits["chatbots_limit"],
                "max_documents": plan_limits["documents_limit"],
                "max_monthly_messages": plan_limits["messages_limit"],
                "max_team_members": plan_limits["team_members_limit"],
            })

            # Record plan change
            event_type = (
                SubscriptionEventType.UPGRADED
                if self._is_upgrade(previous_plan, new_plan)
                else SubscriptionEventType.DOWNGRADED
            )
            await self._record_subscription_history(
                company_id=company_id,
                event_type=event_type,
                previous_plan=previous_plan,
                new_plan=new_plan,
                stripe_subscription_id=subscription_id
            )

        self.client.table("companies").update(update_data).eq("id", company_id).execute()
        logger.info(f"Subscription updated for company {company_id}: {subscription['status']}")

    async def _handle_subscription_deleted(self, subscription: dict):
        """Handle subscription cancellation/deletion"""
        company_id = await self._get_company_by_subscription(subscription["id"])

        if not company_id:
            logger.warning(f"No company found for deleted subscription {subscription['id']}")
            return

        company = await self._get_company(company_id)
        previous_plan = company.get("plan") if company else None

        # Downgrade to free plan
        free_limits = PLAN_CONFIG[PlanTier.FREE]
        self.client.table("companies").update({
            "stripe_subscription_id": None,
            "subscription_status": "ended",
            "plan": "free",
            "max_bots": free_limits["chatbots_limit"],
            "max_documents": free_limits["documents_limit"],
            "max_monthly_messages": free_limits["messages_limit"],
            "max_team_members": free_limits["team_members_limit"],
        }).eq("id", company_id).execute()

        # Record cancellation
        await self._record_subscription_history(
            company_id=company_id,
            event_type=SubscriptionEventType.CANCELED,
            previous_plan=previous_plan,
            new_plan="free",
            stripe_subscription_id=subscription["id"]
        )

        logger.info(f"Subscription deleted for company {company_id}, downgraded to free")

    # ========================================================================
    # PAYMENT HANDLERS
    # ========================================================================

    async def _handle_payment_succeeded(self, invoice: dict):
        """Handle successful payment"""
        company_id = await self._get_company_by_customer(invoice["customer"])
        if not company_id:
            logger.warning(f"No company found for customer {invoice['customer']}")
            return

        # Update or create invoice record
        await self._upsert_invoice(company_id, invoice)

        # Record payment success
        await self._record_subscription_history(
            company_id=company_id,
            event_type=SubscriptionEventType.PAYMENT_SUCCEEDED,
            metadata={"invoice_id": invoice["id"], "amount": invoice["amount_paid"]}
        )

        logger.info(f"Payment succeeded for company {company_id}: ${invoice['amount_paid'] / 100:.2f}")

    async def _handle_payment_failed(self, invoice: dict):
        """Handle failed payment"""
        company_id = await self._get_company_by_customer(invoice["customer"])
        if not company_id:
            logger.warning(f"No company found for customer {invoice['customer']}")
            return

        # Update invoice record
        await self._upsert_invoice(company_id, invoice)

        # Update subscription status
        self.client.table("companies").update({
            "subscription_status": "past_due"
        }).eq("id", company_id).execute()

        # Record payment failure
        await self._record_subscription_history(
            company_id=company_id,
            event_type=SubscriptionEventType.PAYMENT_FAILED,
            metadata={"invoice_id": invoice["id"], "amount": invoice["amount_due"]}
        )

        logger.warning(f"Payment failed for company {company_id}: ${invoice['amount_due'] / 100:.2f}")
        # TODO: Send email notification to company

    async def _handle_invoice_paid(self, invoice: dict):
        """Handle invoice paid event"""
        company_id = await self._get_company_by_customer(invoice["customer"])
        if company_id:
            await self._upsert_invoice(company_id, invoice)

    # ========================================================================
    # CUSTOMER HANDLERS
    # ========================================================================

    async def _handle_customer_updated(self, customer: dict):
        """Handle customer updates (email, address, etc.)"""
        company_id = customer.get("metadata", {}).get("company_id")
        if not company_id:
            company_id = await self._get_company_by_customer(customer["id"])

        if not company_id:
            return

        update_data = {}

        # Sync email
        if customer.get("email"):
            update_data["billing_email"] = customer["email"]

        # Sync billing address
        address = customer.get("address")
        if address:
            if address.get("line1"):
                update_data["billing_address_line1"] = address["line1"]
            if address.get("line2"):
                update_data["billing_address_line2"] = address["line2"]
            if address.get("city"):
                update_data["billing_address_city"] = address["city"]
            if address.get("state"):
                update_data["billing_address_state"] = address["state"]
            if address.get("postal_code"):
                update_data["billing_address_postal_code"] = address["postal_code"]
            if address.get("country"):
                update_data["billing_address_country"] = address["country"]

        if update_data:
            self.client.table("companies").update(update_data).eq("id", company_id).execute()
            logger.info(f"Synced customer data for company {company_id}: {list(update_data.keys())}")

    async def _handle_payment_method_attached(self, payment_method: dict):
        """Handle payment method attachment"""
        company_id = await self._get_company_by_customer(payment_method["customer"])
        if not company_id:
            return

        # Check if already exists
        existing = self.client.table("payment_methods").select("id").eq(
            "stripe_payment_method_id", payment_method["id"]
        ).execute()

        if not existing.data:
            card = payment_method.get("card", {})
            self.client.table("payment_methods").insert({
                "company_id": company_id,
                "stripe_payment_method_id": payment_method["id"],
                "card_brand": card.get("brand"),
                "card_last4": card.get("last4"),
                "card_exp_month": card.get("exp_month"),
                "card_exp_year": card.get("exp_year"),
                "is_default": False
            }).execute()

    async def _handle_payment_method_detached(self, payment_method: dict):
        """Handle payment method detachment"""
        self.client.table("payment_methods").delete().eq(
            "stripe_payment_method_id", payment_method["id"]
        ).execute()

    # ========================================================================
    # CHECKOUT HANDLERS
    # ========================================================================

    async def _handle_checkout_completed(self, session: dict):
        """Handle completed checkout session"""
        company_id = session.get("metadata", {}).get("company_id")
        plan = session.get("metadata", {}).get("plan", "pro")

        if not company_id:
            logger.warning(f"No company_id in checkout session {session['id']}")
            return

        # Build update data
        update_data = {}

        # Update customer ID if not already set
        customer_id = session.get("customer")
        if customer_id:
            update_data["stripe_customer_id"] = customer_id

            # Fetch customer details from Stripe to get email and address
            try:
                customer = stripe.Customer.retrieve(customer_id)
                if customer.email:
                    update_data["billing_email"] = customer.email
                    logger.info(f"Synced billing email for company {company_id}: {customer.email}")

                # Sync billing address from customer
                if customer.address:
                    address = customer.address
                    if address.get("line1"):
                        update_data["billing_address_line1"] = address["line1"]
                    if address.get("line2"):
                        update_data["billing_address_line2"] = address["line2"]
                    if address.get("city"):
                        update_data["billing_address_city"] = address["city"]
                    if address.get("state"):
                        update_data["billing_address_state"] = address["state"]
                    if address.get("postal_code"):
                        update_data["billing_address_postal_code"] = address["postal_code"]
                    if address.get("country"):
                        update_data["billing_address_country"] = address["country"]
                    logger.info(f"Synced billing address for company {company_id}")

            except stripe.error.StripeError as e:
                logger.warning(f"Failed to fetch customer details: {e}")

        # Also get email from session if available
        if not update_data.get("billing_email") and session.get("customer_email"):
            update_data["billing_email"] = session["customer_email"]

        # Update company
        if update_data:
            self.client.table("companies").update(update_data).eq("id", company_id).execute()

        # The subscription.created event will handle the rest
        logger.info(f"Checkout completed for company {company_id}, plan: {plan}")

    # ========================================================================
    # SUBSCRIPTION SCHEDULE HANDLERS (for scheduled downgrades)
    # ========================================================================

    async def _handle_schedule_completed(self, schedule: dict):
        """
        Handle subscription schedule completion.
        This fires when a scheduled downgrade takes effect at the end of a billing cycle.
        """
        subscription_id = schedule.get("subscription")
        if not subscription_id:
            logger.warning(f"Schedule completed with no subscription ID: {schedule.get('id')}")
            return

        company_id = await self._get_company_by_subscription(subscription_id)
        if not company_id:
            logger.warning(f"No company found for subscription {subscription_id}")
            return

        # Get the new plan from the subscription
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            price_id = subscription["items"]["data"][0]["price"]["id"]
            new_plan = self._get_plan_from_price_id(price_id)

            if not new_plan:
                logger.warning(f"Could not determine plan from price {price_id}")
                return

            # Update company with new plan and clear pending plan
            plan_limits = PLAN_CONFIG.get(PlanTier(new_plan), PLAN_CONFIG[PlanTier.FREE])
            update_data = {
                "plan": new_plan,
                "subscription_status": subscription.get("status", "active"),
                "max_bots": plan_limits["chatbots_limit"],
                "max_documents": plan_limits["documents_limit"],
                "max_monthly_messages": plan_limits["messages_limit"],
                "max_team_members": plan_limits["team_members_limit"],
                "pending_plan": None,
                "pending_plan_effective_date": None
            }

            self.client.table("companies").update(update_data).eq("id", company_id).execute()

            # Record in history
            await self._record_subscription_history(
                company_id=company_id,
                event_type=SubscriptionEventType.DOWNGRADED,
                new_plan=new_plan,
                metadata={"schedule_id": schedule.get("id"), "completed": True}
            )

            logger.info(f"Scheduled downgrade completed for company {company_id}. New plan: {new_plan}")

        except stripe.error.StripeError as e:
            logger.error(f"Error retrieving subscription {subscription_id}: {e}")

    async def _handle_schedule_released(self, schedule: dict):
        """
        Handle subscription schedule release.
        This fires when a scheduled downgrade is cancelled by the user.
        """
        subscription_id = schedule.get("subscription")
        if not subscription_id:
            return

        company_id = await self._get_company_by_subscription(subscription_id)
        if not company_id:
            return

        # Clear pending plan info (user cancelled the downgrade)
        self.client.table("companies").update({
            "pending_plan": None,
            "pending_plan_effective_date": None
        }).eq("id", company_id).execute()

        logger.info(f"Subscription schedule released for company {company_id}. Pending downgrade cleared.")

    # ========================================================================
    # HELPER METHODS
    # ========================================================================

    async def _get_company(self, company_id: str) -> Optional[dict]:
        """Get company by ID"""
        response = self.client.table("companies").select("*").eq("id", company_id).execute()
        return response.data[0] if response.data else None

    async def _get_company_by_customer(self, customer_id: str) -> Optional[str]:
        """Get company ID by Stripe customer ID"""
        response = self.client.table("companies").select("id").eq(
            "stripe_customer_id", customer_id
        ).execute()
        return response.data[0]["id"] if response.data else None

    async def _get_company_by_subscription(self, subscription_id: str) -> Optional[str]:
        """Get company ID by Stripe subscription ID"""
        response = self.client.table("companies").select("id").eq(
            "stripe_subscription_id", subscription_id
        ).execute()
        return response.data[0]["id"] if response.data else None

    async def _is_event_processed(self, event_id: str) -> bool:
        """Check if webhook event was already processed"""
        response = self.client.table("stripe_webhook_events").select("processed").eq(
            "stripe_event_id", event_id
        ).execute()
        return response.data and response.data[0].get("processed", False)

    async def _record_event(self, event_id: str, event_type: str, payload: dict):
        """Record webhook event"""
        self.client.table("stripe_webhook_events").upsert({
            "stripe_event_id": event_id,
            "event_type": event_type,
            "payload": payload,
            "processed": False
        }, on_conflict="stripe_event_id").execute()

    async def _mark_event_processed(self, event_id: str):
        """Mark event as processed"""
        self.client.table("stripe_webhook_events").update({
            "processed": True,
            "processed_at": datetime.utcnow().isoformat()
        }).eq("stripe_event_id", event_id).execute()

    async def _mark_event_failed(self, event_id: str, error: str):
        """Mark event as failed"""
        self.client.table("stripe_webhook_events").update({
            "processing_error": error
        }).eq("stripe_event_id", event_id).execute()

    async def _record_subscription_history(
        self,
        company_id: str,
        event_type: SubscriptionEventType,
        previous_plan: Optional[str] = None,
        new_plan: Optional[str] = None,
        stripe_subscription_id: Optional[str] = None,
        metadata: dict = None
    ):
        """Record subscription event in history"""
        self.client.table("subscription_history").insert({
            "company_id": company_id,
            "event_type": event_type.value,
            "previous_plan": previous_plan,
            "new_plan": new_plan,
            "stripe_subscription_id": stripe_subscription_id,
            "metadata": metadata or {}
        }).execute()

    async def _upsert_invoice(self, company_id: str, invoice: dict):
        """Create or update invoice record"""
        invoice_data = {
            "company_id": company_id,
            "stripe_invoice_id": invoice["id"],
            "amount_due": invoice.get("amount_due", 0),
            "amount_paid": invoice.get("amount_paid", 0),
            "currency": invoice.get("currency", "usd"),
            "status": invoice.get("status", "open"),
            "invoice_date": datetime.fromtimestamp(invoice["created"]).isoformat() if invoice.get("created") else None,
            "due_date": datetime.fromtimestamp(invoice["due_date"]).isoformat() if invoice.get("due_date") else None,
            "invoice_pdf_url": invoice.get("invoice_pdf"),
            "hosted_invoice_url": invoice.get("hosted_invoice_url"),
            "subscription_id": invoice.get("subscription"),
            "billing_reason": invoice.get("billing_reason")
        }

        # Add paid_at if invoice is paid
        if invoice.get("status") == "paid" and invoice.get("status_transitions", {}).get("paid_at"):
            invoice_data["paid_at"] = datetime.fromtimestamp(
                invoice["status_transitions"]["paid_at"]
            ).isoformat()

        self.client.table("invoices").upsert(
            invoice_data,
            on_conflict="stripe_invoice_id"
        ).execute()

    def _get_plan_from_price_id(self, price_id: str) -> Optional[str]:
        """Determine plan from Stripe price ID"""
        if price_id == settings.STRIPE_PRICE_ID_PRO:
            return "pro"
        elif price_id == settings.STRIPE_PRICE_ID_ENTERPRISE:
            return "enterprise"
        return None

    def _is_upgrade(self, from_plan: Optional[str], to_plan: str) -> bool:
        """Check if plan change is an upgrade"""
        plan_order = {"free": 0, "pro": 1, "enterprise": 2}
        from_order = plan_order.get(from_plan or "free", 0)
        to_order = plan_order.get(to_plan, 0)
        return to_order > from_order


# Global handler instance
webhook_handler = StripeWebhookHandler()
