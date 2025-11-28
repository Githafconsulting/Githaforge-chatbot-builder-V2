# PowerShell script to run Supabase migrations
# Usage:
#   1. Edit SUPABASE_URI below with your connection string
#   2. Run: .\run_migrations.ps1

# ============================================================================
# CONFIGURATION
# ============================================================================

$SUPABASE_URI = "postgresql://postgres.beuyzvlluccdtlwpebax:BFph7PXTjJxlFeTo@aws-1-eu-north-1.pooler.supabase.com:6543/postgres"

# ============================================================================
# VALIDATION
# ============================================================================

if ($SUPABASE_URI -eq "postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres") {
    Write-Host "❌ ERROR: Please edit this script and set your SUPABASE_URI" -ForegroundColor Red
    Write-Host ""
    Write-Host "Find your connection string at:" -ForegroundColor Yellow
    Write-Host "  Supabase Dashboard → Settings → Database → Connection String (URI)" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Check if psql is installed
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "❌ ERROR: psql not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install PostgreSQL client:" -ForegroundColor Yellow
    Write-Host "  Option 1 (Scoop):      scoop install postgresql" -ForegroundColor Yellow
    Write-Host "  Option 2 (Chocolatey): choco install postgresql" -ForegroundColor Yellow
    Write-Host "  Option 3 (Official):   https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# ============================================================================
# RUN MIGRATIONS
# ============================================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Multi-Tenancy Database Migrations" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Change to migrations directory
Set-Location $scriptDir

Write-Host "Testing connection..." -ForegroundColor Yellow
$testResult = psql "$SUPABASE_URI" -c "SELECT version();" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Connection failed!" -ForegroundColor Red
    Write-Host $testResult -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check password is correct" -ForegroundColor Yellow
    Write-Host "  2. Check project reference is correct" -ForegroundColor Yellow
    Write-Host "  3. Ensure database is not paused (Supabase dashboard)" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "✅ Connection successful!" -ForegroundColor Green
Write-Host ""
Write-Host "Running migrations..." -ForegroundColor Yellow
Write-Host ""

# Run master migration script
psql "$SUPABASE_URI" -f RUN_ALL_MIGRATIONS.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ Migrations completed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Verify tables in Supabase dashboard" -ForegroundColor White
    Write-Host "  2. Run data migration script (if you have existing data)" -ForegroundColor White
    Write-Host "  3. Test RLS policies" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check error messages above" -ForegroundColor Yellow
    Write-Host "You may need to:" -ForegroundColor Yellow
    Write-Host "  1. Drop failed tables manually" -ForegroundColor White
    Write-Host "  2. Fix SQL syntax errors" -ForegroundColor White
    Write-Host "  3. Re-run this script" -ForegroundColor White
    Write-Host ""
}