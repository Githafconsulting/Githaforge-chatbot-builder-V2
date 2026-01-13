"""
Script to sync billing address from Stripe to the database for existing customers.
Run this once after adding the billing address columns to the companies table.

Usage:
    cd backend
    python -m scripts.sync_billing_address
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import stripe
from app.core.config import settings
from app.core.database import get_supabase_client

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


def sync_billing_addresses():
    """Sync billing addresses from Stripe to database for all companies with Stripe customers."""
    client = get_supabase_client()

    # Get all companies with Stripe customer IDs
    response = client.table("companies").select(
        "id, name, stripe_customer_id, billing_address_line1"
    ).not_.is_("stripe_customer_id", "null").execute()

    if not response.data:
        print("No companies with Stripe customer IDs found.")
        return

    print(f"Found {len(response.data)} companies with Stripe customer IDs")

    synced_count = 0
    for company in response.data:
        company_id = company["id"]
        company_name = company["name"]
        customer_id = company["stripe_customer_id"]

        # Skip if already has address
        if company.get("billing_address_line1"):
            print(f"  [{company_name}] Already has billing address, skipping")
            continue

        try:
            # Fetch customer from Stripe
            customer = stripe.Customer.retrieve(customer_id)

            if not customer.address:
                print(f"  [{company_name}] No address in Stripe")
                continue

            address = customer.address
            update_data = {}

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
                client.table("companies").update(update_data).eq("id", company_id).execute()
                print(f"  [{company_name}] Synced address: {address.get('line1')}, {address.get('city')}, {address.get('country')}")
                synced_count += 1
            else:
                print(f"  [{company_name}] Address exists but no fields to sync")

        except stripe.error.InvalidRequestError as e:
            if "No such customer" in str(e):
                print(f"  [{company_name}] Customer {customer_id} not found in Stripe (may be deleted)")
            else:
                print(f"  [{company_name}] Stripe error: {e}")
        except Exception as e:
            print(f"  [{company_name}] Error: {e}")

    print(f"\nSynced billing address for {synced_count} companies")


if __name__ == "__main__":
    print("Syncing billing addresses from Stripe...")
    print("=" * 50)
    sync_billing_addresses()
    print("=" * 50)
    print("Done!")
