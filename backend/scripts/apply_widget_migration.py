"""
Apply widget appearance migration
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import get_supabase_client

def apply_migration():
    """Apply the widget appearance migration"""
    client = get_supabase_client()

    # Read the migration SQL
    migration_file = Path(__file__).parent / "migrations" / "017_add_widget_appearance.sql"
    sql = migration_file.read_text()

    print("Applying widget appearance migration...")
    print("=" * 80)

    try:
        # Execute the SQL using the database connection
        # Note: Supabase client doesn't have direct SQL execution in Python SDK
        # We need to use the Supabase dashboard or psycopg2 for raw SQL

        print("\nManual Migration Required:")
        print("\n1. Open your Supabase dashboard")
        print("2. Go to SQL Editor")
        print("3. Copy and paste the SQL from the migration file")
        print("\nMigration file: scripts/migrations/017_add_widget_appearance.sql")

    except Exception as e:
        print(f"\nError: {e}")
        return False

    return True

if __name__ == "__main__":
    apply_migration()