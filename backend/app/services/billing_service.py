"""
Billing service for Stripe payment integration
"""
import stripe
from datetime import datetime, timedelta
from typing import Optional, List, Tuple
from app.core.config import settings
from app.core.database import get_supabase_client
from app.models.billing import (
    PlanTier, SubscriptionStatus, InvoiceStatus, SubscriptionEventType,
    PaymentMethod, Invoice, SubscriptionInfo, SubscriptionHistory,
    UsageMetrics, UsageLimits, UsageStatus, UsageRecord, BillingInfo,
    CheckoutSessionResponse, CustomerPortalResponse, PlanChangeResponse,
    CancelSubscriptionResponse, WebhookEvent, PLAN_CONFIG, get_plan_limits, is_unlimited
)
from app.utils.logger import logger

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


class BillingService:
    """Service for managing billing and Stripe integration"""

    def __init__(self):
        self.client = get_supabase_client()

    # ========================================================================
    # STRIPE CUSTOMER MANAGEMENT
    # ========================================================================

    async def create_stripe_customer(
        self,
        company_id: str,
        email: str,
        name: str,
        metadata: dict = None
    ) -> str:
        """Create a Stripe customer for a company"""
        try:
            # Check if customer already exists
            company = await self._get_company(company_id)
            if company and company.get("stripe_customer_id"):
                return company["stripe_customer_id"]

            # Create Stripe customer
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={
                    "company_id": company_id,
                    **(metadata or {})
                }
            )

            # Update company with Stripe customer ID
            self.client.table("companies").update({
                "stripe_customer_id": customer.id,
                "billing_email": email
            }).eq("id", company_id).execute()

            logger.info(f"Created Stripe customer {customer.id} for company {company_id}")
            return customer.id

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating customer: {e}")
            raise
        except Exception as e:
            logger.error(f"Error creating Stripe customer: {e}")
            raise

    async def get_or_create_stripe_customer(
        self,
        company_id: str,
        email: str,
        name: str
    ) -> str:
        """Get existing or create new Stripe customer"""
        company = await self._get_company(company_id)
        if company and company.get("stripe_customer_id"):
            return company["stripe_customer_id"]
        return await self.create_stripe_customer(company_id, email, name)

    # ========================================================================
    # CHECKOUT SESSIONS
    # ========================================================================

    async def create_checkout_session(
        self,
        company_id: str,
        plan: PlanTier,
        success_url: Optional[str] = None,
        cancel_url: Optional[str] = None
    ) -> CheckoutSessionResponse:
        """Create a Stripe checkout session for subscription"""
        try:
            company = await self._get_company(company_id)
            if not company:
                raise ValueError(f"Company {company_id} not found")

            # Get or create Stripe customer
            customer_id = await self.get_or_create_stripe_customer(
                company_id,
                company.get("billing_email") or company.get("email", ""),
                company.get("name", "")
            )

            # Get price ID for the plan
            price_id = self._get_price_id_for_plan(plan)
            if not price_id:
                raise ValueError(f"No Stripe price configured for plan: {plan}")

            # Build URLs
            base_url = settings.FRONTEND_URL
            success = success_url or settings.STRIPE_SUCCESS_URL or f"{base_url}/admin/billing?success=true"
            cancel = cancel_url or settings.STRIPE_CANCEL_URL or f"{base_url}/admin/billing?canceled=true"

            # Create checkout session
            session = stripe.checkout.Session.create(
                customer=customer_id,
                mode="subscription",
                line_items=[{
                    "price": price_id,
                    "quantity": 1
                }],
                success_url=success,
                cancel_url=cancel,
                metadata={
                    "company_id": company_id,
                    "plan": plan.value
                },
                subscription_data={
                    "metadata": {
                        "company_id": company_id,
                        "plan": plan.value
                    }
                },
                allow_promotion_codes=True,
                billing_address_collection="auto"
            )

            logger.info(f"Created checkout session {session.id} for company {company_id}")
            return CheckoutSessionResponse(
                checkout_url=session.url,
                session_id=session.id
            )

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating checkout session: {e}")
            raise
        except Exception as e:
            logger.error(f"Error creating checkout session: {e}")
            raise

    async def create_customer_portal_session(
        self,
        company_id: str,
        return_url: Optional[str] = None
    ) -> CustomerPortalResponse:
        """Create a Stripe customer portal session for managing subscription"""
        try:
            company = await self._get_company(company_id)
            if not company or not company.get("stripe_customer_id"):
                raise ValueError("Company does not have a Stripe customer")

            return_url = return_url or f"{settings.FRONTEND_URL}/admin/billing"

            session = stripe.billing_portal.Session.create(
                customer=company["stripe_customer_id"],
                return_url=return_url
            )

            return CustomerPortalResponse(portal_url=session.url)

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating portal session: {e}")
            raise
        except Exception as e:
            logger.error(f"Error creating portal session: {e}")
            raise

    # ========================================================================
    # SUBSCRIPTION MANAGEMENT
    # ========================================================================

    async def get_subscription_info(self, company_id: str) -> SubscriptionInfo:
        """Get current subscription information for a company"""
        company = await self._get_company(company_id)
        if not company:
            raise ValueError(f"Company {company_id} not found")

        # Check trial status
        trial_ends_at = None
        is_on_trial = False
        if company.get("trial_ends_at"):
            trial_ends_at = datetime.fromisoformat(company["trial_ends_at"].replace("Z", "+00:00"))
            is_on_trial = trial_ends_at > datetime.now(trial_ends_at.tzinfo)

        # Parse period dates
        period_start = None
        period_end = None
        if company.get("subscription_current_period_start"):
            period_start = datetime.fromisoformat(
                company["subscription_current_period_start"].replace("Z", "+00:00")
            )
        if company.get("subscription_current_period_end"):
            period_end = datetime.fromisoformat(
                company["subscription_current_period_end"].replace("Z", "+00:00")
            )

        return SubscriptionInfo(
            plan=PlanTier(company.get("plan", "free")),
            status=SubscriptionStatus(company.get("subscription_status", "active")),
            stripe_subscription_id=company.get("stripe_subscription_id"),
            stripe_customer_id=company.get("stripe_customer_id"),
            current_period_start=period_start,
            current_period_end=period_end,
            cancel_at_period_end=False,  # Would need to fetch from Stripe for accurate value
            trial_ends_at=trial_ends_at,
            is_on_trial=is_on_trial
        )

    async def update_subscription(
        self,
        company_id: str,
        new_plan: PlanTier,
        prorate: bool = True
    ) -> PlanChangeResponse:
        """Upgrade or downgrade subscription"""
        try:
            company = await self._get_company(company_id)
            if not company:
                raise ValueError(f"Company {company_id} not found")

            current_plan = company.get("plan", "free")
            subscription_id = company.get("stripe_subscription_id")

            # If no subscription exists, need to create checkout
            if not subscription_id:
                raise ValueError("No active subscription. Please complete checkout first.")

            # Get the new price ID
            new_price_id = self._get_price_id_for_plan(new_plan)
            if not new_price_id:
                raise ValueError(f"No Stripe price configured for plan: {new_plan}")

            # Get current subscription from Stripe
            subscription = stripe.Subscription.retrieve(subscription_id)

            # Update the subscription
            updated_subscription = stripe.Subscription.modify(
                subscription_id,
                items=[{
                    "id": subscription["items"]["data"][0]["id"],
                    "price": new_price_id
                }],
                proration_behavior="create_prorations" if prorate else "none",
                metadata={
                    "company_id": company_id,
                    "plan": new_plan.value,
                    "previous_plan": current_plan
                }
            )

            # Update company in database
            plan_limits = PLAN_CONFIG[new_plan]
            self.client.table("companies").update({
                "plan": new_plan.value,
                "subscription_status": updated_subscription.status,
                "max_bots": plan_limits["chatbots_limit"],
                "max_documents": plan_limits["documents_limit"],
                "max_monthly_messages": plan_limits["messages_limit"],
                "max_team_members": plan_limits["team_members_limit"]
            }).eq("id", company_id).execute()

            # Record in history
            event_type = SubscriptionEventType.UPGRADED if new_plan.value > current_plan else SubscriptionEventType.DOWNGRADED
            await self._record_subscription_event(
                company_id=company_id,
                event_type=event_type,
                previous_plan=current_plan,
                new_plan=new_plan.value,
                stripe_subscription_id=subscription_id
            )

            logger.info(f"Updated subscription for company {company_id} from {current_plan} to {new_plan.value}")

            return PlanChangeResponse(
                success=True,
                message=f"Successfully changed plan to {new_plan.value}",
                new_plan=new_plan,
                effective_date=datetime.utcnow(),
                proration_amount=None  # Could calculate from Stripe invoice preview
            )

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error updating subscription: {e}")
            raise
        except Exception as e:
            logger.error(f"Error updating subscription: {e}")
            raise

    async def get_proration_preview(
        self,
        company_id: str,
        new_plan: PlanTier
    ) -> dict:
        """
        Get proration preview for a plan change using Stripe's Invoice.create_preview() API.

        Returns the exact credit/charge amount that would apply.
        Note: Stripe SDK v14+ uses Invoice.create_preview() instead of Invoice.upcoming()
        """
        try:
            company = await self._get_company(company_id)
            if not company:
                raise ValueError(f"Company {company_id} not found")

            subscription_id = company.get("stripe_subscription_id")
            customer_id = company.get("stripe_customer_id")
            current_plan = company.get("plan", "free")

            if not subscription_id or not customer_id:
                raise ValueError("No active subscription found")

            if current_plan == new_plan.value:
                raise ValueError("New plan is the same as current plan")

            # Get the new price ID
            new_price_id = self._get_price_id_for_plan(new_plan)
            if not new_price_id:
                raise ValueError(f"No Stripe price configured for plan: {new_plan}")

            # Get current subscription to find the item ID
            subscription = stripe.Subscription.retrieve(subscription_id)
            subscription_item = subscription["items"]["data"][0]
            subscription_item_id = subscription_item["id"]
            # In Stripe SDK v14+, period info is on the subscription item, not the subscription
            period_end = subscription_item.get("current_period_end")

            # Use Stripe's Invoice.create_preview() to preview the proration
            # (In Stripe SDK v14+, Invoice.upcoming() was replaced with Invoice.create_preview())
            upcoming_invoice = stripe.Invoice.create_preview(
                customer=customer_id,
                subscription=subscription_id,
                subscription_details={
                    "items": [{
                        "id": subscription_item_id,
                        "price": new_price_id
                    }],
                    "proration_behavior": "create_prorations"
                }
            )

            # Parse the proration details from line items
            # In Stripe API v14+, proration line items are identified by description
            # containing "Unused time" (credit) or "Remaining time" (charge for upgrade)
            proration_credit = 0  # Credit from unused time on old plan
            proration_charge = 0  # Charge for remaining time on new plan

            for line_item in upcoming_invoice.lines.data:
                description = line_item.description or ""
                is_proration = "Unused time" in description or "Remaining time" in description

                if is_proration:
                    if line_item.amount < 0:
                        proration_credit += abs(line_item.amount)
                    else:
                        proration_charge += line_item.amount

            # Calculate net amount (negative = credit, positive = charge)
            net_amount = proration_charge - proration_credit
            is_downgrade = PLAN_CONFIG[new_plan]["price"] < PLAN_CONFIG[PlanTier(current_plan)]["price"]

            return {
                "current_plan": current_plan,
                "new_plan": new_plan.value,
                "is_downgrade": is_downgrade,
                "proration_credit": proration_credit,  # Amount credited (in cents)
                "proration_charge": proration_charge,  # Amount charged (in cents)
                "net_amount": net_amount,  # Net effect (in cents, negative = credit)
                "currency": upcoming_invoice.currency,
                "immediate_charge": upcoming_invoice.amount_due if upcoming_invoice.amount_due > 0 else 0,
                # Human-readable values in dollars
                "credit_dollars": proration_credit / 100,
                "charge_dollars": proration_charge / 100,
                "net_dollars": net_amount / 100,
                "period_end": period_end
            }

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error getting proration preview: {e}")
            raise ValueError(f"Failed to get proration preview: {str(e)}")
        except Exception as e:
            logger.error(f"Error getting proration preview: {e}")
            raise

    async def cancel_subscription(
        self,
        company_id: str,
        cancel_immediately: bool = False,
        feedback: Optional[str] = None,
        issue_refund: bool = True
    ) -> CancelSubscriptionResponse:
        """
        Cancel a subscription.

        Args:
            company_id: The company ID
            cancel_immediately: If True, cancel now. If False, cancel at period end.
            feedback: Optional cancellation feedback
            issue_refund: If True and cancel_immediately=True, issue pro-rated refund
        """
        try:
            company = await self._get_company(company_id)
            if not company:
                raise ValueError(f"Company {company_id} not found")

            subscription_id = company.get("stripe_subscription_id")
            if not subscription_id:
                raise ValueError("No active subscription to cancel")

            refund_amount = None

            if cancel_immediately:
                # Get subscription details before canceling
                subscription = stripe.Subscription.retrieve(subscription_id)

                # Calculate pro-rated refund if requested
                if issue_refund and subscription.status == "active":
                    refund_amount = await self._calculate_and_issue_refund(
                        subscription=subscription,
                        company_id=company_id
                    )

                # Cancel immediately
                stripe.Subscription.delete(subscription_id)
                cancel_at = datetime.utcnow()

                # Downgrade to free immediately
                await self._downgrade_to_free(company_id)
            else:
                # Cancel at period end (no refund needed - user keeps access)
                subscription = stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True,
                    metadata={
                        "cancellation_feedback": feedback or ""
                    }
                )
                cancel_at = datetime.fromtimestamp(subscription.current_period_end)

                # Update status
                self.client.table("companies").update({
                    "subscription_status": "canceled"
                }).eq("id", company_id).execute()

            # Record cancellation
            await self._record_subscription_event(
                company_id=company_id,
                event_type=SubscriptionEventType.CANCELED,
                previous_plan=company.get("plan"),
                new_plan="free" if cancel_immediately else None,
                stripe_subscription_id=subscription_id,
                metadata={
                    "feedback": feedback,
                    "immediate": cancel_immediately,
                    "refund_amount": refund_amount
                }
            )

            message = "Subscription canceled"
            if cancel_immediately:
                message += " immediately"
                if refund_amount and refund_amount > 0:
                    message += f". Refund of ${refund_amount / 100:.2f} has been issued."
            else:
                message += " at period end"

            logger.info(f"Canceled subscription for company {company_id}, immediate={cancel_immediately}, refund={refund_amount}")

            return CancelSubscriptionResponse(
                success=True,
                message=message,
                cancel_at=cancel_at,
                effective_immediately=cancel_immediately,
                refund_amount=refund_amount
            )

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error canceling subscription: {e}")
            raise
        except Exception as e:
            logger.error(f"Error canceling subscription: {e}")
            raise

    # ========================================================================
    # PAYMENT METHODS
    # ========================================================================

    async def get_payment_methods(self, company_id: str) -> List[PaymentMethod]:
        """Get all payment methods for a company"""
        response = self.client.table("payment_methods").select("*").eq(
            "company_id", company_id
        ).order("created_at", desc=True).execute()

        return [PaymentMethod(**pm) for pm in response.data]

    async def add_payment_method(
        self,
        company_id: str,
        stripe_payment_method_id: str,
        set_as_default: bool = True
    ) -> PaymentMethod:
        """Add a payment method from Stripe"""
        try:
            company = await self._get_company(company_id)
            if not company or not company.get("stripe_customer_id"):
                raise ValueError("Company does not have a Stripe customer")

            customer_id = company["stripe_customer_id"]

            # Attach payment method to customer
            stripe.PaymentMethod.attach(
                stripe_payment_method_id,
                customer=customer_id
            )

            # Get payment method details
            pm = stripe.PaymentMethod.retrieve(stripe_payment_method_id)

            # If setting as default, update customer's default payment method
            if set_as_default:
                stripe.Customer.modify(
                    customer_id,
                    invoice_settings={"default_payment_method": stripe_payment_method_id}
                )

                # Clear other defaults in our DB
                self.client.table("payment_methods").update({
                    "is_default": False
                }).eq("company_id", company_id).execute()

            # Store in database
            card = pm.card
            payment_method_data = {
                "company_id": company_id,
                "stripe_payment_method_id": stripe_payment_method_id,
                "card_brand": card.brand if card else None,
                "card_last4": card.last4 if card else None,
                "card_exp_month": card.exp_month if card else None,
                "card_exp_year": card.exp_year if card else None,
                "is_default": set_as_default
            }

            response = self.client.table("payment_methods").insert(
                payment_method_data
            ).execute()

            logger.info(f"Added payment method {stripe_payment_method_id} for company {company_id}")
            return PaymentMethod(**response.data[0])

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error adding payment method: {e}")
            raise
        except Exception as e:
            logger.error(f"Error adding payment method: {e}")
            raise

    async def remove_payment_method(
        self,
        company_id: str,
        payment_method_id: str
    ) -> bool:
        """Remove a payment method"""
        try:
            # Get the payment method
            response = self.client.table("payment_methods").select("*").eq(
                "id", payment_method_id
            ).eq("company_id", company_id).execute()

            if not response.data:
                raise ValueError("Payment method not found")

            pm = response.data[0]

            # Detach from Stripe
            stripe.PaymentMethod.detach(pm["stripe_payment_method_id"])

            # Delete from database
            self.client.table("payment_methods").delete().eq("id", payment_method_id).execute()

            logger.info(f"Removed payment method {payment_method_id} for company {company_id}")
            return True

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error removing payment method: {e}")
            raise
        except Exception as e:
            logger.error(f"Error removing payment method: {e}")
            raise

    # ========================================================================
    # INVOICES
    # ========================================================================

    async def get_invoices(
        self,
        company_id: str,
        limit: int = 10,
        status: Optional[InvoiceStatus] = None
    ) -> List[Invoice]:
        """Get invoices for a company"""
        query = self.client.table("invoices").select("*").eq("company_id", company_id)

        if status:
            query = query.eq("status", status.value)

        response = query.order("invoice_date", desc=True).limit(limit).execute()
        return [Invoice(**inv) for inv in response.data]

    async def sync_invoices_from_stripe(self, company_id: str) -> int:
        """Sync invoices from Stripe to local database"""
        try:
            company = await self._get_company(company_id)
            if not company or not company.get("stripe_customer_id"):
                return 0

            # Fetch invoices from Stripe
            invoices = stripe.Invoice.list(
                customer=company["stripe_customer_id"],
                limit=100
            )

            synced_count = 0
            for inv in invoices.data:
                # Check if invoice already exists
                existing = self.client.table("invoices").select("id").eq(
                    "stripe_invoice_id", inv.id
                ).execute()

                invoice_data = {
                    "company_id": company_id,
                    "stripe_invoice_id": inv.id,
                    "amount_due": inv.amount_due,
                    "amount_paid": inv.amount_paid,
                    "currency": inv.currency,
                    "status": inv.status,
                    "invoice_date": datetime.fromtimestamp(inv.created).isoformat() if inv.created else None,
                    "due_date": datetime.fromtimestamp(inv.due_date).isoformat() if inv.due_date else None,
                    "paid_at": datetime.fromtimestamp(inv.status_transitions.paid_at).isoformat() if inv.status_transitions and inv.status_transitions.paid_at else None,
                    "invoice_pdf_url": inv.invoice_pdf,
                    "hosted_invoice_url": inv.hosted_invoice_url,
                    "subscription_id": inv.subscription,
                    "billing_reason": inv.billing_reason
                }

                if existing.data:
                    self.client.table("invoices").update(invoice_data).eq(
                        "stripe_invoice_id", inv.id
                    ).execute()
                else:
                    self.client.table("invoices").insert(invoice_data).execute()
                    synced_count += 1

            logger.info(f"Synced {synced_count} new invoices for company {company_id}")
            return synced_count

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error syncing invoices: {e}")
            raise
        except Exception as e:
            logger.error(f"Error syncing invoices: {e}")
            raise

    # ========================================================================
    # USAGE TRACKING
    # ========================================================================

    async def get_usage_status(self, company_id: str) -> UsageStatus:
        """Get current usage status for a company"""
        company = await self._get_company(company_id)
        if not company:
            raise ValueError(f"Company {company_id} not found")

        # Get current billing month
        billing_month = datetime.utcnow().strftime("%Y-%m")

        # Get or create usage record
        usage = await self._get_or_create_usage_record(company_id, billing_month)

        # Get limits based on plan
        plan = PlanTier(company.get("plan", "free"))
        limits = get_plan_limits(plan)

        # Calculate percentages
        def calc_percent(used: int, limit: int) -> float:
            if is_unlimited(limit):
                return 0.0
            return min((used / limit) * 100, 100) if limit > 0 else 100

        current = UsageMetrics(
            messages_used=usage.get("messages_used", 0),
            documents_used=usage.get("documents_used", 0),
            chatbots_used=usage.get("chatbots_used", 0),
            team_members_used=usage.get("team_members_used", 0)
        )

        # Check if over any limit
        is_over = False
        if not is_unlimited(limits.messages_limit) and current.messages_used >= limits.messages_limit:
            is_over = True
        if not is_unlimited(limits.documents_limit) and current.documents_used >= limits.documents_limit:
            is_over = True
        if not is_unlimited(limits.chatbots_limit) and current.chatbots_used >= limits.chatbots_limit:
            is_over = True
        if not is_unlimited(limits.team_members_limit) and current.team_members_used >= limits.team_members_limit:
            is_over = True

        return UsageStatus(
            current=current,
            limits=limits,
            billing_month=billing_month,
            messages_percentage=calc_percent(current.messages_used, limits.messages_limit),
            documents_percentage=calc_percent(current.documents_used, limits.documents_limit),
            chatbots_percentage=calc_percent(current.chatbots_used, limits.chatbots_limit),
            team_members_percentage=calc_percent(current.team_members_used, limits.team_members_limit),
            is_over_limit=is_over
        )

    async def increment_usage(
        self,
        company_id: str,
        messages: int = 0,
        documents: int = 0,
        chatbots: int = 0,
        team_members: int = 0
    ) -> UsageMetrics:
        """Increment usage counters for a company"""
        billing_month = datetime.utcnow().strftime("%Y-%m")
        usage = await self._get_or_create_usage_record(company_id, billing_month)

        new_usage = {
            "messages_used": usage.get("messages_used", 0) + messages,
            "documents_used": usage.get("documents_used", 0) + documents,
            "chatbots_used": usage.get("chatbots_used", 0) + chatbots,
            "team_members_used": usage.get("team_members_used", 0) + team_members
        }

        self.client.table("usage_records").update(new_usage).eq(
            "company_id", company_id
        ).eq("billing_month", billing_month).execute()

        return UsageMetrics(**new_usage)

    async def check_usage_limit(
        self,
        company_id: str,
        resource: str
    ) -> Tuple[bool, int, int]:
        """
        Check if a usage limit has been reached.
        Returns: (allowed, current_usage, limit)
        """
        usage_status = await self.get_usage_status(company_id)

        resource_map = {
            "messages": (usage_status.current.messages_used, usage_status.limits.messages_limit),
            "documents": (usage_status.current.documents_used, usage_status.limits.documents_limit),
            "chatbots": (usage_status.current.chatbots_used, usage_status.limits.chatbots_limit),
            "team_members": (usage_status.current.team_members_used, usage_status.limits.team_members_limit)
        }

        if resource not in resource_map:
            raise ValueError(f"Unknown resource: {resource}")

        current, limit = resource_map[resource]

        if is_unlimited(limit):
            return True, current, limit

        return current < limit, current, limit

    # ========================================================================
    # BILLING INFO
    # ========================================================================

    async def get_billing_info(self, company_id: str) -> BillingInfo:
        """Get complete billing information for a company"""
        company = await self._get_company(company_id)
        if not company:
            raise ValueError(f"Company {company_id} not found")

        subscription = await self.get_subscription_info(company_id)
        payment_methods = await self.get_payment_methods(company_id)
        usage = await self.get_usage_status(company_id)

        default_pm = next((pm for pm in payment_methods if pm.is_default), None)

        return BillingInfo(
            company_id=company_id,
            company_name=company.get("name", ""),
            subscription=subscription,
            payment_methods=payment_methods,
            default_payment_method=default_pm,
            billing_email=company.get("billing_email"),
            usage=usage,
            next_invoice_date=subscription.current_period_end,
            next_invoice_amount=PLAN_CONFIG.get(subscription.plan, {}).get("price")
        )

    # ========================================================================
    # HELPER METHODS
    # ========================================================================

    async def _get_company(self, company_id: str) -> Optional[dict]:
        """Get company by ID"""
        response = self.client.table("companies").select("*").eq("id", company_id).execute()
        return response.data[0] if response.data else None

    async def _get_or_create_usage_record(self, company_id: str, billing_month: str) -> dict:
        """Get or create usage record for a billing month"""
        response = self.client.table("usage_records").select("*").eq(
            "company_id", company_id
        ).eq("billing_month", billing_month).execute()

        if response.data:
            return response.data[0]

        # Create new record
        company = await self._get_company(company_id)
        plan = company.get("plan", "free") if company else "free"
        limits = PLAN_CONFIG.get(PlanTier(plan), PLAN_CONFIG[PlanTier.FREE])

        new_record = {
            "company_id": company_id,
            "billing_month": billing_month,
            "messages_used": 0,
            "documents_used": 0,
            "chatbots_used": 0,
            "team_members_used": 0,
            "plan_at_time": plan,
            "messages_limit": limits["messages_limit"],
            "documents_limit": limits["documents_limit"],
            "chatbots_limit": limits["chatbots_limit"],
            "team_members_limit": limits["team_members_limit"]
        }

        response = self.client.table("usage_records").insert(new_record).execute()
        return response.data[0]

    async def _record_subscription_event(
        self,
        company_id: str,
        event_type: SubscriptionEventType,
        previous_plan: Optional[str] = None,
        new_plan: Optional[str] = None,
        stripe_subscription_id: Optional[str] = None,
        stripe_event_id: Optional[str] = None,
        metadata: dict = None
    ):
        """Record a subscription event in history"""
        self.client.table("subscription_history").insert({
            "company_id": company_id,
            "event_type": event_type.value,
            "previous_plan": previous_plan,
            "new_plan": new_plan,
            "stripe_subscription_id": stripe_subscription_id,
            "stripe_event_id": stripe_event_id,
            "metadata": metadata or {}
        }).execute()

    async def _calculate_and_issue_refund(
        self,
        subscription: stripe.Subscription,
        company_id: str
    ) -> Optional[int]:
        """
        Calculate and issue a pro-rated refund for unused subscription time.

        Returns the refund amount in cents, or None if no refund was issued.

        Note: As of Stripe API 2025-03-31, Invoice.payment_intent is no longer available.
        We now use the charge from the invoice's payment or list charges for the customer.
        """
        try:
            # Get the latest paid invoice for this subscription
            invoices = stripe.Invoice.list(
                subscription=subscription.id,
                limit=1,
                status="paid"
            )

            if not invoices.data:
                logger.info(f"No paid invoices found for subscription {subscription.id}")
                return None

            latest_invoice = invoices.data[0]

            # Get the charge ID from the invoice
            # In newer Stripe API, use 'charge' field directly or fetch from payments
            charge_id = None

            # Method 1: Try to get charge directly from invoice (if available)
            if hasattr(latest_invoice, 'charge') and latest_invoice.charge:
                charge_id = latest_invoice.charge

            # Method 2: If no charge, try to get from payment_intents via charges list
            if not charge_id:
                # List charges for this customer related to this invoice
                charges = stripe.Charge.list(
                    customer=subscription.customer,
                    limit=5
                )
                # Find the charge for this invoice amount
                for charge in charges.data:
                    if charge.paid and charge.amount == latest_invoice.amount_paid:
                        charge_id = charge.id
                        break

            if not charge_id:
                logger.info(f"No charge found for invoice {latest_invoice.id}")
                return None

            # Calculate unused time
            period_start = subscription.current_period_start
            period_end = subscription.current_period_end
            now = datetime.utcnow().timestamp()

            total_period_seconds = period_end - period_start
            unused_seconds = period_end - now

            if unused_seconds <= 0:
                logger.info(f"No unused time for subscription {subscription.id}")
                return None

            # Calculate pro-rated refund amount
            unused_ratio = unused_seconds / total_period_seconds
            refund_amount = int(latest_invoice.amount_paid * unused_ratio)

            # Minimum refund threshold (avoid tiny refunds)
            if refund_amount < 100:  # Less than $1.00
                logger.info(f"Refund amount too small ({refund_amount} cents), skipping")
                return None

            # Issue the refund using the charge ID
            refund = stripe.Refund.create(
                charge=charge_id,
                amount=refund_amount,
                reason="requested_by_customer",
                metadata={
                    "company_id": company_id,
                    "subscription_id": subscription.id,
                    "refund_type": "pro_rated_cancellation",
                    "unused_days": int(unused_seconds / 86400)
                }
            )

            logger.info(
                f"Issued refund of {refund_amount} cents for company {company_id}, "
                f"refund_id={refund.id}, unused_days={int(unused_seconds / 86400)}"
            )

            return refund_amount

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error issuing refund: {e}")
            # Don't fail the cancellation if refund fails
            return None
        except Exception as e:
            logger.error(f"Error calculating/issuing refund: {e}")
            return None

    async def _downgrade_to_free(self, company_id: str):
        """Downgrade a company to free plan"""
        free_limits = PLAN_CONFIG[PlanTier.FREE]
        self.client.table("companies").update({
            "plan": "free",
            "subscription_status": "ended",
            "stripe_subscription_id": None,
            "max_bots": free_limits["chatbots_limit"],
            "max_documents": free_limits["documents_limit"],
            "max_monthly_messages": free_limits["messages_limit"],
            "max_team_members": free_limits["team_members_limit"]
        }).eq("id", company_id).execute()

        await self._record_subscription_event(
            company_id=company_id,
            event_type=SubscriptionEventType.DOWNGRADED,
            new_plan="free"
        )

        logger.info(f"Downgraded company {company_id} to free plan")

    def _get_price_id_for_plan(self, plan: PlanTier) -> Optional[str]:
        """Get Stripe price ID for a plan tier"""
        if plan == PlanTier.PRO:
            return settings.STRIPE_PRICE_ID_PRO
        elif plan == PlanTier.ENTERPRISE:
            return settings.STRIPE_PRICE_ID_ENTERPRISE
        return None


# Global service instance
billing_service = BillingService()
