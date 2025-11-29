"""
Seed script to create the Githaforge Platform company and website demo chatbot.

This script should be run once after migration 015_add_system_chatbot_support.sql
It creates:
1. Githaforge Platform company (is_platform=True)
2. Website Demo Bot chatbot (is_system=True)

Usage:
    cd backend
    python -m scripts.seed_platform_chatbot
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_KEY must be set in .env file")
    sys.exit(1)

# Create Supabase client
client = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_or_create_platform_company():
    """Get existing platform company or create a new one."""

    # Check if platform company already exists
    response = client.table("companies").select("*").eq("is_platform", True).execute()

    if response.data and len(response.data) > 0:
        print(f"Platform company already exists: {response.data[0]['name']} (ID: {response.data[0]['id']})")
        return response.data[0]

    # Create platform company
    company_data = {
        "name": "Githaforge Platform",
        "website": "https://githaforge.com",
        "logo_url": "/githaf_logo.png",
        "primary_color": "#a855f7",  # Purple theme
        "secondary_color": "#3b82f6",  # Blue accent
        "company_size": "startup",
        "industry": "SaaS",
        "plan": "enterprise",  # Platform has unlimited access
        "max_bots": 999,
        "max_documents": 99999,
        "max_monthly_messages": 9999999,
        "is_platform": True,
        "is_active": True
    }

    response = client.table("companies").insert(company_data).execute()

    if response.data and len(response.data) > 0:
        print(f"Created platform company: {response.data[0]['name']} (ID: {response.data[0]['id']})")
        return response.data[0]
    else:
        print(f"Error creating platform company: {response}")
        return None


def get_or_create_system_chatbot(company_id: str):
    """Get existing system chatbot or create a new one."""

    # Check if system chatbot already exists
    response = client.table("chatbots").select("*").eq("is_system", True).execute()

    if response.data and len(response.data) > 0:
        print(f"System chatbot already exists: {response.data[0]['name']} (ID: {response.data[0]['id']})")
        return response.data[0]

    # Create system chatbot
    chatbot_data = {
        "company_id": company_id,
        "name": "Githaforge Website Bot",
        "description": "Official Githaforge website demo chatbot. Answers questions about Githaforge features, pricing, and how to get started.",
        "greeting_message": "Hi! I'm the Githaforge assistant. I can help you learn about our AI chatbot platform, pricing plans, features, and how to get started. What would you like to know?",
        "primary_color": "#a855f7",
        "secondary_color": "#3b82f6",
        "allowed_scopes": None,  # Access all scopes within platform company
        "allowed_domains": ["*"],  # Allow from all domains (it's the demo)
        "rate_limit_per_ip": 20,  # Higher limit for demo
        "model_preset": "balanced",
        "temperature": 0.7,
        "max_tokens": 500,
        "top_k": 5,
        "similarity_threshold": 0.4,
        "is_active": True,
        "is_system": True,
        "deploy_status": "deployed",
        # Branding fields (Migration 016)
        "brand_name": "Githaforge",
        "support_email": "support@githaforge.com",
        "brand_website": "https://githaforge.com"
    }

    response = client.table("chatbots").insert(chatbot_data).execute()

    if response.data and len(response.data) > 0:
        print(f"Created system chatbot: {response.data[0]['name']} (ID: {response.data[0]['id']})")
        return response.data[0]
    else:
        print(f"Error creating system chatbot: {response}")
        return None


def main():
    print("=" * 60)
    print("Githaforge Platform Chatbot Seed Script")
    print("=" * 60)
    print()

    # Step 1: Create or get platform company
    print("Step 1: Setting up platform company...")
    company = get_or_create_platform_company()

    if not company:
        print("Failed to create/get platform company. Exiting.")
        sys.exit(1)

    print()

    # Step 2: Create or get system chatbot
    print("Step 2: Setting up system chatbot...")
    chatbot = get_or_create_system_chatbot(company["id"])

    if not chatbot:
        print("Failed to create/get system chatbot. Exiting.")
        sys.exit(1)

    print()
    print("=" * 60)
    print("Setup Complete!")
    print("=" * 60)
    print()
    print("Platform Company ID:", company["id"])
    print("System Chatbot ID:", chatbot["id"])
    print()
    print("Add the following to your .env file:")
    print("-" * 40)
    print(f"PLATFORM_COMPANY_ID={company['id']}")
    print(f"SYSTEM_CHATBOT_ID={chatbot['id']}")
    print("-" * 40)
    print()
    print("Next steps:")
    print("1. Run the migration: 015_add_system_chatbot_support.sql")
    print("2. Add PLATFORM_COMPANY_ID and SYSTEM_CHATBOT_ID to your .env file")
    print("3. Upload the knowledge base document via Super Admin")
    print()


if __name__ == "__main__":
    main()