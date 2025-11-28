#!/bin/bash
# Test script to verify psql connection to Supabase
# Usage: Replace YOUR_CONNECTION_STRING and run this script

echo "Testing Supabase connection..."
echo ""
echo "Replace YOUR_CONNECTION_STRING below with your actual Supabase URI"
echo "Format: postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres"
echo ""

# Example (replace with your actual connection string):
# psql "postgresql://postgres:your-password@db.abcdefghijk.supabase.co:5432/postgres" -c "SELECT version();"

echo "If connection succeeds, you'll see PostgreSQL version info"
echo "If it fails, check:"
echo "  1. Password is correct"
echo "  2. Project reference is correct"
echo "  3. Database is not paused (check Supabase dashboard)"