# ================================================================
# EMERGENCY ROLLBACK SCRIPT - PHASE 1
# Purpose: Rollback database to pre-migration state
# Date: October 5, 2025
# ================================================================

param(
    [string]$BackupDate = "20251005",
    [switch]$Force = $false
)

$ErrorActionPreference = "Stop"

# Configuration
$BACKUP_DIR = "backup/$BackupDate"
$SUPABASE_DB_URL = $env:DATABASE_URL
$MIGRATION_LOG = "MIGRATION_LOG.md"

Write-Host "================================================================" -ForegroundColor Red
Write-Host "EMERGENCY DATABASE ROLLBACK - PHASE 1" -ForegroundColor Red
Write-Host "================================================================" -ForegroundColor Red
Write-Host ""

if (-not $Force) {
    Write-Host "⚠️  CRITICAL WARNING" -ForegroundColor Red
    Write-Host "This will COMPLETELY RESTORE the database to backup state!" -ForegroundColor Yellow
    Write-Host "ALL DATA CREATED AFTER $BackupDate WILL BE LOST!" -ForegroundColor Red
    Write-Host ""
    
    $confirmation = Read-Host "Are you absolutely sure? Type 'ROLLBACK' to continue"
    if ($confirmation -ne "ROLLBACK") {
        Write-Host "Rollback cancelled" -ForegroundColor Yellow
        exit 0
    }
}

# Verify backup exists
if (-not $SUPABASE_DB_URL) {
    Write-Host "❌ ERROR: DATABASE_URL not configured" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "$BACKUP_DIR")) {
    Write-Host "❌ ERROR: Backup directory not found: $BACKUP_DIR" -ForegroundColor Red
    Write-Host "Available backups:" -ForegroundColor Yellow
    Get-ChildItem "backup" -Directory | ForEach-Object { Write-Host "   • $($_.Name)" -ForegroundColor Gray }
    exit 1
}

# Find the most recent schema backup
$schemaBackups = Get-ChildItem "$BACKUP_DIR" -Filter "*.sql" | Sort-Object LastWriteTime -Descending

if ($schemaBackups.Count -eq 0) {
    Write-Host "❌ ERROR: No SQL backup files found in $BACKUP_DIR" -ForegroundColor Red
    exit 1
}

$backupFile = $schemaBackups[0].FullName
Write-Host "🔍 Using backup: $($schemaBackups[0].Name)" -ForegroundColor Cyan

# Log rollback start
$rollbackStart = Get-Date
Add-Content $MIGRATION_LOG "`n## EMERGENCY ROLLBACK - $rollbackStart"
Add-Content $MIGRATION_LOG "Backup source: $backupFile"
Add-Content $MIGRATION_LOG "Reason: User initiated emergency rollback"

Write-Host ""
Write-Host "🔄 Starting rollback process..." -ForegroundColor Yellow

try {
    # Step 1: Test database connection
    Write-Host "1️⃣ Testing database connection..." -ForegroundColor Cyan
    $testResult = Invoke-Expression "psql `"$SUPABASE_DB_URL`" -c `"SELECT 1`" 2>&1"
    if ($LASTEXITCODE -ne 0) {
        throw "Database connection failed"
    }
    Write-Host "✅ Database connection verified" -ForegroundColor Green

    # Step 2: Create pre-rollback snapshot
    Write-Host ""
    Write-Host "2️⃣ Creating pre-rollback snapshot..." -ForegroundColor Cyan
    $preRollbackBackup = "backup/pre-rollback-snapshot-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"
    Invoke-Expression "pg_dump `"$SUPABASE_DB_URL`" --schema-only > `"$preRollbackBackup`""
    Write-Host "✅ Pre-rollback snapshot: $preRollbackBackup" -ForegroundColor Green
    Add-Content $MIGRATION_LOG "✅ Pre-rollback snapshot: $preRollbackBackup"

    # Step 3: Drop all existing tables and schemas
    Write-Host ""
    Write-Host "3️⃣ Clearing current schema..." -ForegroundColor Cyan
    
    # Get list of tables to drop
    $dropTablesQuery = @"
SELECT 'DROP TABLE IF EXISTS public.' || tablename || ' CASCADE;' as drop_statement
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
"@
    
    $dropStatements = Invoke-Expression "psql `"$SUPABASE_DB_URL`" -t -c `"$dropTablesQuery`" 2>&1"
    
    if ($dropStatements) {
        # Execute drop statements
        $dropStatements | ForEach-Object {
            $stmt = $_.Trim()
            if ($stmt -and $stmt.StartsWith("DROP")) {
                Invoke-Expression "psql `"$SUPABASE_DB_URL`" -c `"$stmt`" 2>&1" | Out-Null
            }
        }
    }
    
    Write-Host "✅ Current schema cleared" -ForegroundColor Green

    # Step 4: Restore from backup
    Write-Host ""
    Write-Host "4️⃣ Restoring from backup..." -ForegroundColor Cyan
    
    $restoreOutput = Invoke-Expression "psql `"$SUPABASE_DB_URL`" -f `"$backupFile`" 2>&1"
    
    # Check for errors
    if ($restoreOutput -match "ERROR|FATAL") {
        throw "Restore failed with errors: $restoreOutput"
    }
    
    Write-Host "✅ Database restored from backup" -ForegroundColor Green

    # Step 5: Verify restoration
    Write-Host ""
    Write-Host "5️⃣ Verifying restoration..." -ForegroundColor Cyan
    
    # Check that tables exist
    $tableCount = Invoke-Expression "psql `"$SUPABASE_DB_URL`" -t -c `"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'`" 2>&1"
    $tableCount = [int]$tableCount.Trim()
    
    if ($tableCount -gt 0) {
        Write-Host "✅ Verification passed: $tableCount tables restored" -ForegroundColor Green
        Add-Content $MIGRATION_LOG "✅ Verification: $tableCount tables restored"
    } else {
        throw "Verification failed: No tables found after restore"
    }

    # Rollback complete
    $rollbackEnd = Get-Date
    $duration = $rollbackEnd - $rollbackStart

    Write-Host ""
    Write-Host "✅ ROLLBACK COMPLETED SUCCESSFULLY" -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "Duration: $($duration.TotalSeconds) seconds" -ForegroundColor Cyan
    Write-Host "Database restored to: $BackupDate backup" -ForegroundColor Cyan
    Write-Host "Pre-rollback snapshot: $preRollbackBackup" -ForegroundColor Cyan

    # Update migration log
    Add-Content $MIGRATION_LOG "✅ ROLLBACK COMPLETED SUCCESSFULLY"
    Add-Content $MIGRATION_LOG "Duration: $($duration.TotalSeconds) seconds"
    Add-Content $MIGRATION_LOG "End time: $rollbackEnd"
    Add-Content $MIGRATION_LOG "Tables restored: $tableCount"

} catch {
    Write-Host ""
    Write-Host "❌ ROLLBACK FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    Add-Content $MIGRATION_LOG "❌ ROLLBACK FAILED: $($_.Exception.Message)"
    Add-Content $MIGRATION_LOG "Manual intervention required!"
    
    Write-Host ""
    Write-Host "🆘 MANUAL INTERVENTION REQUIRED" -ForegroundColor Red
    Write-Host "Contact database administrator immediately" -ForegroundColor Yellow
    Write-Host "Available backups:" -ForegroundColor Yellow
    Get-ChildItem "backup" -Directory | ForEach-Object { 
        Write-Host "   • $($_.Name)" -ForegroundColor Gray
    }
    
    exit 1
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Verify application functionality" -ForegroundColor Gray
Write-Host "2. Review what caused the rollback need" -ForegroundColor Gray
Write-Host "3. Plan corrective actions before next migration attempt" -ForegroundColor Gray
Write-Host ""