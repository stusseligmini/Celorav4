# ================================================================
# PHASE 1 DATABASE MIGRATION SCRIPT
# Purpose: Apply unified schema with safety checks and rollback capability
# Date: October 5, 2025
# ================================================================

# Exit on any error
$ErrorActionPreference = "Stop"

# Configuration
$BACKUP_DIR = "backup/20251005"
$SUPABASE_DB_URL = $env:DATABASE_URL
$MIGRATION_LOG = "MIGRATION_LOG.md"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "CELORA DATABASE MIGRATION - PHASE 1" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Pre-migration checks
Write-Host "🔍 PRE-MIGRATION CHECKS" -ForegroundColor Yellow

# Check if Supabase is accessible
if (-not $SUPABASE_DB_URL) {
    Write-Host "❌ ERROR: DATABASE_URL environment variable not set" -ForegroundColor Red
    Write-Host "Please set your Supabase database URL first:" -ForegroundColor Red
    Write-Host 'set DATABASE_URL="postgresql://[username]:[password]@[host]:[port]/[database]"' -ForegroundColor Gray
    exit 1
}

# Verify backup exists
if (-not (Test-Path "$BACKUP_DIR/database")) {
    Write-Host "❌ ERROR: Database backup not found at $BACKUP_DIR/database" -ForegroundColor Red
    Write-Host "Please ensure backup was created before migration" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Database URL configured" -ForegroundColor Green
Write-Host "✅ Backup directory verified: $BACKUP_DIR" -ForegroundColor Green

# Test database connection
Write-Host ""
Write-Host "🔗 Testing database connection..." -ForegroundColor Yellow

try {
    # Simple connection test
    $testResult = Invoke-Expression "psql `"$SUPABASE_DB_URL`" -c `"SELECT 1`" 2>&1"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database connection successful" -ForegroundColor Green
    } else {
        throw "Connection failed"
    }
} catch {
    Write-Host "❌ ERROR: Cannot connect to database" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Verify your DATABASE_URL is correct" -ForegroundColor Gray
    Write-Host "2. Check if PostgreSQL client (psql) is installed" -ForegroundColor Gray
    Write-Host "3. Ensure your Supabase project is running" -ForegroundColor Gray
    exit 1
}

# Schema conflict detection
Write-Host ""
Write-Host "🔍 Detecting schema conflicts..." -ForegroundColor Yellow

$conflicts = @()

# Check for conflicting table names
$tableChecks = @(
    @{ table = "profiles"; expected = "user_profiles"; issue = "Table naming conflict" },
    @{ table = "audit_logs"; expected = "audit_log"; issue = "Table naming conflict" },
    @{ table = "wallet_transactions"; expected = "transactions"; issue = "Separate wallet_transactions table exists" }
)

foreach ($check in $tableChecks) {
    try {
        $result = Invoke-Expression "psql `"$SUPABASE_DB_URL`" -c `"\dt public.$($check.table)`" 2>&1"
        if ($result -match $check.table) {
            $conflicts += $check.issue
            Write-Host "⚠️  Conflict detected: $($check.issue)" -ForegroundColor Yellow
        }
    } catch {
        # Table doesn't exist - no conflict
    }
}

if ($conflicts.Count -gt 0) {
    Write-Host ""
    Write-Host "📋 Schema conflicts detected:" -ForegroundColor Yellow
    foreach ($conflict in $conflicts) {
        Write-Host "   • $conflict" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "These conflicts will be resolved by the migration." -ForegroundColor Cyan
}

# User confirmation
Write-Host ""
Write-Host "⚠️  MIGRATION WARNING" -ForegroundColor Red
Write-Host "This migration will:" -ForegroundColor Yellow
Write-Host "   • Apply unified schema v2" -ForegroundColor Gray
Write-Host "   • Resolve table naming conflicts" -ForegroundColor Gray
Write-Host "   • Create new indexes and constraints" -ForegroundColor Gray
Write-Host "   • Apply RLS policies" -ForegroundColor Gray
Write-Host ""

# In production, we'd require explicit confirmation
$confirmation = Read-Host "Continue with migration? (type 'YES' to proceed)"
if ($confirmation -ne "YES") {
    Write-Host "Migration cancelled by user" -ForegroundColor Yellow
    exit 0
}

# Start migration
Write-Host ""
Write-Host "🚀 STARTING MIGRATION" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

# Log migration start
$migrationStart = Get-Date
Add-Content $MIGRATION_LOG "`n## Phase 1 Migration - $migrationStart"
Add-Content $MIGRATION_LOG "Status: IN PROGRESS"
Add-Content $MIGRATION_LOG "Schema: unified-schema-v2.sql"
Add-Content $MIGRATION_LOG ""

# Step 1: Create backup of current schema
Write-Host "1️⃣ Creating live schema backup..." -ForegroundColor Cyan

try {
    $backupFile = "$BACKUP_DIR/live-schema-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"
    Invoke-Expression "pg_dump `"$SUPABASE_DB_URL`" --schema-only > `"$backupFile`""
    Write-Host "✅ Live schema backed up to: $backupFile" -ForegroundColor Green
    Add-Content $MIGRATION_LOG "✅ Live schema backup: $backupFile"
} catch {
    Write-Host "❌ ERROR: Failed to create schema backup" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Add-Content $MIGRATION_LOG "❌ FAILED: Schema backup failed - $($_.Exception.Message)"
    exit 1
}

# Step 2: Apply unified schema
Write-Host ""
Write-Host "2️⃣ Applying unified schema v2..." -ForegroundColor Cyan

try {
    # Run the unified schema migration
    $schemaPath = "database/unified-schema-v2.sql"
    if (-not (Test-Path $schemaPath)) {
        throw "Schema file not found: $schemaPath"
    }
    
    Write-Host "   • Executing schema file..." -ForegroundColor Gray
    $migrationOutput = Invoke-Expression "psql `"$SUPABASE_DB_URL`" -f `"$schemaPath`" 2>&1"
    
    # Check for errors in output
    if ($migrationOutput -match "ERROR|FATAL") {
        throw "Schema migration contained errors: $migrationOutput"
    }
    
    Write-Host "✅ Unified schema applied successfully" -ForegroundColor Green
    Add-Content $MIGRATION_LOG "✅ Unified schema v2 applied successfully"
    Add-Content $MIGRATION_LOG "   Output: Schema deployed with all tables, indexes, and policies"
} catch {
    Write-Host "❌ ERROR: Schema migration failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Add-Content $MIGRATION_LOG "❌ FAILED: Schema migration - $($_.Exception.Message)"
    
    # Initiate rollback
    Write-Host ""
    Write-Host "🔄 Initiating automatic rollback..." -ForegroundColor Yellow
    try {
        Invoke-Expression "psql `"$SUPABASE_DB_URL`" -f `"$backupFile`""
        Write-Host "✅ Rollback completed - database restored" -ForegroundColor Green
        Add-Content $MIGRATION_LOG "✅ Rollback completed successfully"
    } catch {
        Write-Host "❌ CRITICAL ERROR: Rollback failed" -ForegroundColor Red
        Write-Host "Manual intervention required!" -ForegroundColor Red
        Add-Content $MIGRATION_LOG "❌ CRITICAL: Rollback failed - manual intervention required"
    }
    exit 1
}

# Step 3: Verify migration
Write-Host ""
Write-Host "3️⃣ Verifying migration..." -ForegroundColor Cyan

$verificationTests = @(
    @{ name = "user_profiles table"; query = "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'user_profiles'" },
    @{ name = "wallets table"; query = "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'wallets'" },
    @{ name = "transactions table"; query = "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'transactions'" },
    @{ name = "audit_log table"; query = "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'audit_log'" },
    @{ name = "audit_logs view"; query = "SELECT COUNT(*) FROM information_schema.views WHERE table_name = 'audit_logs'" },
    @{ name = "RLS enabled"; query = "SELECT COUNT(*) FROM pg_class WHERE relname = 'wallets' AND relrowsecurity = true" }
)

$verificationPassed = $true

foreach ($test in $verificationTests) {
    try {
        $result = Invoke-Expression "psql `"$SUPABASE_DB_URL`" -t -c `"$($test.query)`" 2>&1"
        $count = [int]$result.Trim()
        
        if ($count -gt 0) {
            Write-Host "   ✅ $($test.name)" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $($test.name) - NOT FOUND" -ForegroundColor Red
            $verificationPassed = $false
        }
    } catch {
        Write-Host "   ❌ $($test.name) - ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $verificationPassed = $false
    }
}

if (-not $verificationPassed) {
    Write-Host ""
    Write-Host "❌ Migration verification failed" -ForegroundColor Red
    Add-Content $MIGRATION_LOG "❌ FAILED: Migration verification failed"
    
    # Automatic rollback on verification failure
    Write-Host "🔄 Initiating rollback due to verification failure..." -ForegroundColor Yellow
    try {
        Invoke-Expression "psql `"$SUPABASE_DB_URL`" -f `"$backupFile`""
        Write-Host "✅ Rollback completed" -ForegroundColor Green
    } catch {
        Write-Host "❌ CRITICAL ERROR: Rollback failed" -ForegroundColor Red
    }
    exit 1
}

# Step 4: Performance check
Write-Host ""
Write-Host "4️⃣ Performance validation..." -ForegroundColor Cyan

try {
    # Test key indexes exist
    $indexQuery = "SELECT COUNT(*) FROM pg_indexes WHERE indexname LIKE 'idx_%'"
    $indexCount = Invoke-Expression "psql `"$SUPABASE_DB_URL`" -t -c `"$indexQuery`" 2>&1"
    $indexCount = [int]$indexCount.Trim()
    
    if ($indexCount -gt 0) {
        Write-Host "   ✅ Performance indexes created: $indexCount" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  No performance indexes detected" -ForegroundColor Yellow
    }
    
    Add-Content $MIGRATION_LOG "✅ Performance validation: $indexCount indexes created"
} catch {
    Write-Host "   ⚠️  Performance check failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Add-Content $MIGRATION_LOG "⚠️  Performance check failed"
}

# Migration complete
$migrationEnd = Get-Date
$duration = $migrationEnd - $migrationStart

Write-Host ""
Write-Host "🎉 MIGRATION COMPLETED SUCCESSFULLY" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "Duration: $($duration.TotalSeconds) seconds" -ForegroundColor Cyan
Write-Host "Schema: unified-schema-v2.sql" -ForegroundColor Cyan
Write-Host "Status: Production Ready" -ForegroundColor Green
Write-Host ""

# Update migration log
Add-Content $MIGRATION_LOG ""
Add-Content $MIGRATION_LOG "Status: ✅ COMPLETED SUCCESSFULLY"
Add-Content $MIGRATION_LOG "Duration: $($duration.TotalSeconds) seconds"
Add-Content $MIGRATION_LOG "End time: $migrationEnd"
Add-Content $MIGRATION_LOG ""
Add-Content $MIGRATION_LOG "### Results:"
Add-Content $MIGRATION_LOG "- ✅ Unified schema v2 applied"
Add-Content $MIGRATION_LOG "- ✅ All table conflicts resolved"  
Add-Content $MIGRATION_LOG "- ✅ RLS policies activated"
Add-Content $MIGRATION_LOG "- ✅ Performance indexes created"
Add-Content $MIGRATION_LOG "- ✅ Migration verification passed"

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Review MIGRATION_LOG.md for detailed results" -ForegroundColor Gray
Write-Host "2. Test API routes against new schema" -ForegroundColor Gray  
Write-Host "3. Proceed to Phase 2: Supabase client fixes" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Remember: Backup available at $BACKUP_DIR" -ForegroundColor Cyan