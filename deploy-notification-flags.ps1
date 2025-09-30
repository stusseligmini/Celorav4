# Deploy Notification Feature Flags
# This script executes the SQL scripts for setting up the notification feature flags system

# Set environment variables (these should be configured properly in your environment)
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "celora"
$DB_USER = "postgres"
# Uncomment and set password if needed
# $DB_PASSWORD = "your_password" 

# Check if PGPASSWORD is set, if not prompt for it
if (-not $env:PGPASSWORD) {
    $securePassword = Read-Host -Prompt "Enter database password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

Write-Host "===== Deploying Notification Feature Flags System =====" -ForegroundColor Cyan

# Function to execute SQL scripts
function Execute-SQLScript {
    param (
        [string]$scriptPath,
        [string]$description
    )
    
    Write-Host "Executing: $description" -ForegroundColor Yellow
    
    try {
        psql -h $DB_HOST -p $DB_PORT -d $DB_NAME -U $DB_USER -f $scriptPath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Success: $description" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "✗ Failed: $description (Exit code: $LASTEXITCODE)" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "✗ Error: $_" -ForegroundColor Red
        return $false
    }
}

# Current directory
$currentDir = Get-Location
$dbDir = Join-Path -Path $currentDir -ChildPath "database"

# Step 1: Deploy notification feature flags
$step1Success = Execute-SQLScript -scriptPath (Join-Path -Path $dbDir -ChildPath "notifications-feature-flags.sql") -description "Setting up notification feature flags"

# Step 2: Deploy extended notification feature flags
$step2Success = Execute-SQLScript -scriptPath (Join-Path -Path $dbDir -ChildPath "notification-feature-flags-extended.sql") -description "Setting up extended notification features"

# Step 3: Deploy user notification preferences
$step3Success = Execute-SQLScript -scriptPath (Join-Path -Path $dbDir -ChildPath "user-notification-preferences.sql") -description "Setting up user notification preferences"

# Summary
Write-Host "`n===== Deployment Summary =====" -ForegroundColor Cyan
if ($step1Success -and $step2Success -and $step3Success) {
    Write-Host "All notification feature flag scripts were deployed successfully!" -ForegroundColor Green
}
else {
    $failedSteps = @()
    if (-not $step1Success) { $failedSteps += "notification feature flags" }
    if (-not $step2Success) { $failedSteps += "extended notification features" }
    if (-not $step3Success) { $failedSteps += "user notification preferences" }
    
    Write-Host "The following scripts failed deployment: $($failedSteps -join ', ')" -ForegroundColor Red
    Write-Host "Please check the error messages above and try again." -ForegroundColor Yellow
    Exit 1
}

# Clear password from environment when done
if ($env:PGPASSWORD) {
    $env:PGPASSWORD = ""
}