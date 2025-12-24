"""
Run SQL migration files against Supabase using postgrest-py
Usage: python -m scripts.run_migration <migration_file>
Example: python -m scripts.run_migration scripts/migrations/032_blogs.sql
"""

import sys
import os
import httpx

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


def run_migration(migration_file: str):
    """Run a SQL migration file using Supabase REST API."""

    # Read the migration file
    if not os.path.exists(migration_file):
        print(f"Error: Migration file not found: {migration_file}")
        return False

    with open(migration_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    print(f"Running migration: {migration_file}")
    print("-" * 60)

    # Use Supabase REST API to run SQL via the sql endpoint
    # Note: This requires the service_role key
    url = f"{settings.SUPABASE_URL}/rest/v1/rpc/exec_sql"

    headers = {
        "apikey": settings.SUPABASE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    # Try to run via RPC if available
    try:
        response = httpx.post(
            url,
            headers=headers,
            json={"query": sql_content},
            timeout=60.0
        )

        if response.status_code == 200:
            print("Migration executed successfully!")
            return True
        elif response.status_code == 404:
            print("Note: exec_sql RPC function not found.")
            print("\nTo run this migration, please:")
            print("1. Go to your Supabase Dashboard")
            print("2. Navigate to SQL Editor")
            print("3. Copy and paste the contents of the migration file")
            print("4. Run the SQL")
            print(f"\nMigration file: {migration_file}")
            return False
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            return False

    except Exception as e:
        print(f"Error running migration: {e}")
        print("\nTo run this migration manually:")
        print("1. Go to your Supabase Dashboard")
        print("2. Navigate to SQL Editor")
        print("3. Copy and paste the contents of the migration file")
        print("4. Run the SQL")
        print(f"\nMigration file: {migration_file}")
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.run_migration <migration_file>")
        print("Example: python -m scripts.run_migration scripts/migrations/032_blogs.sql")
        sys.exit(1)

    migration_file = sys.argv[1]
    success = run_migration(migration_file)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
