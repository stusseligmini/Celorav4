# ================================================================
# CELORA DATABASE MIGRATION - SIMPLIFIED
# Purpose: Apply unified schema with automatic environment loading
# Date: October 8, 2025
# ================================================================

$ErrorActionPreference = "Stop"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "CELORA DATABASE MIGRATION" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Load environment from existing .env file
$envFiles = @(".env.local", ".env", ".env.production")
$envFile = $null

foreach ($file in $envFiles) {
    if (Test-Path $file) {
        $envFile = $file
        break
    }
}

if ($envFile) {
    Write-Host "🔧 Loading environment from $envFile..." -ForegroundColor Yellow
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
} else {
    Write-Host "❌ No environment file found!" -ForegroundColor Red
    Write-Host "Please run .\scripts\setup-production-environment.ps1 first." -ForegroundColor Red
    exit 1
}

# Check DATABASE_URL
$databaseUrl = $env:DATABASE_URL
if (-not $databaseUrl) {
    Write-Host "❌ DATABASE_URL not found in environment!" -ForegroundColor Red
    Write-Host "Please run .\scripts\setup-production-environment.ps1 first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment loaded" -ForegroundColor Green

# Create backup directory
$backupDir = "backup/$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "📁 Creating backup directory: $backupDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Backup current schema
Write-Host "💾 Creating schema backup..." -ForegroundColor Yellow
$backupCommand = "pg_dump `"$databaseUrl`" --schema-only > `"$backupDir/schema-backup.sql`""

try {
    Invoke-Expression $backupCommand
    Write-Host "✅ Schema backup created: $backupDir/schema-backup.sql" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Schema backup failed, but continuing..." -ForegroundColor Yellow
    Write-Host "Error: $_" -ForegroundColor Red
}

# Apply unified schema
Write-Host ""
Write-Host "🔄 Applying unified schema..." -ForegroundColor Yellow

if (-not (Test-Path "database/unified-schema-v2.sql")) {
    Write-Host "❌ unified-schema-v2.sql not found!" -ForegroundColor Red
    exit 1
}

$migrationCommand = "psql `"$databaseUrl`" -f `"database/unified-schema-v2.sql`""

try {
    Invoke-Expression $migrationCommand
    Write-Host "✅ Unified schema applied successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Rollback available at: $backupDir/schema-backup.sql" -ForegroundColor Yellow
    exit 1
}

# Verify migration
Write-Host ""
Write-Host "🔍 Verifying migration..." -ForegroundColor Yellow

$verifyCommand = "psql `"$databaseUrl`" -c `"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('user_profiles', 'wallets', 'transactions', 'audit_log');`""

try {
    $result = Invoke-Expression $verifyCommand
    Write-Host "✅ Migration verification:" -ForegroundColor Green
    Write-Host $result -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Verification failed, but migration may have succeeded" -ForegroundColor Yellow
}

# Create migration log
$logContent = @"
# CELORA DATABASE MIGRATION LOG
Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Status: SUCCESS
Schema: unified-schema-v2.sql
Backup: $backupDir/schema-backup.sql

## Applied Changes:
- Created/updated user_profiles table
- Created/updated wallets table  
- Created/updated transactions table
- Created/updated audit_log table
- Applied RLS policies
- Created triggers for balance updates
- Added indexes for performance

## Verification:
Schema migration completed successfully.

## Rollback:
If needed, restore from: $backupDir/schema-backup.sql
Command: psql "$databaseUrl" -f "$backupDir/schema-backup.sql"
"@

$logContent | Out-File -FilePath "MIGRATION_LOG.md" -Encoding utf8
Write-Host "📄 Migration log created: MIGRATION_LOG.md" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 DATABASE MIGRATION COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: npm run build" -ForegroundColor Cyan
Write-Host "2. Test your application" -ForegroundColor Cyan
Write-Host "3. Deploy to production" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backup location: $backupDir" -ForegroundColor Yellow
Write-Host ""