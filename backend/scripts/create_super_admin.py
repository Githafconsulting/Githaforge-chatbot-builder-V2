#!/usr/bin/env python3
"""
Quick Super Admin Creation Script
Creates a super admin user for platform administration
"""

import os
import sys
from passlib.context import CryptContext
from supabase import create_client, Client

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_super_admin():
    """Create a super admin user"""

    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()

    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ Error: SUPABASE_URL and SUPABASE_KEY must be set in .env file")
        sys.exit(1)

    # Create Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Super admin credentials
    email = "superadmin@githaf.com"
    password = "superadmin123"
    full_name = "Super Administrator"

    print("🔧 Creating Super Admin User...")
    print(f"📧 Email: {email}")
    print(f"🔑 Password: {password}")
    print("⚠️  IMPORTANT: Change this password immediately after first login!\n")

    # Check if user already exists
    try:
        existing = supabase.table("users").select("*").eq("email", email).execute()
        if existing.data:
            print(f"⚠️  User {email} already exists!")

            # Check if already super admin
            if existing.data[0].get("is_super_admin"):
                print("✅ User is already a super admin. No changes needed.")
                return
            else:
                print("🔄 Updating existing user to super admin status...")
                supabase.table("users").update({
                    "is_super_admin": True,
                    "is_admin": True,
                    "is_active": True
                }).eq("email", email).execute()
                print("✅ User updated to super admin!")
                return
    except Exception as e:
        print(f"❌ Error checking existing user: {e}")

    # Hash password
    password_hash = pwd_context.hash(password)

    # Create user
    try:
        result = supabase.table("users").insert({
            "email": email,
            "password_hash": password_hash,
            "full_name": full_name,
            "is_active": True,
            "is_admin": True,
            "is_super_admin": True
        }).execute()

        print("✅ Super Admin created successfully!")
        print(f"\n📋 Login Details:")
        print(f"   URL: http://localhost:5173/super-admin-login")
        print(f"   Email: {email}")
        print(f"   Password: {password}")
        print(f"\n⚠️  SECURITY WARNING:")
        print(f"   - Change the password immediately after first login")
        print(f"   - Enable 2FA when available")
        print(f"   - Never share these credentials")

    except Exception as e:
        print(f"❌ Error creating super admin: {e}")
        sys.exit(1)

if __name__ == "__main__":
    create_super_admin()
