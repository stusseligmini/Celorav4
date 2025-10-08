# ================================================================
# CELORA PRODUCTION ENVIRONMENT SETUP
# Purpose: Guide user through environment configuration and database migration
# Date: October 8, 2025
# ================================================================

$ErrorActionPreference = "Stop"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "CELORA PRODUCTION ENVIRONMENT SETUP" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Check for existing .env files
Write-Host "🔍 Checking existing environment configuration..." -ForegroundColor Yellow

$envFiles = @(".env.local", ".env", ".env.production")
$existingEnv = $null

foreach ($file in $envFiles) {
    if (Test-Path $file) {
        $existingEnv = $file
        Write-Host "✅ Found existing environment file: $file" -ForegroundColor Green
        break
    }
}

if (-not $existingEnv) {
    Write-Host "📝 No existing environment file found." -ForegroundColor Yellow
    Write-Host "Creating .env.local from template..." -ForegroundColor Yellow
    
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env.local"
        Write-Host "✅ Created .env.local from .env.example" -ForegroundColor Green
        $existingEnv = ".env.local"
    } else {
        Write-Host "❌ ERROR: .env.example not found!" -ForegroundColor Red
        exit 1
    }
}

# Load current environment
Write-Host ""
Write-Host "🔧 Loading environment variables from $existingEnv..." -ForegroundColor Yellow

# Simple env loader for PowerShell
Get-Content $existingEnv | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

# Check critical environment variables
Write-Host ""
Write-Host "🔍 Validating environment configuration..." -ForegroundColor Yellow

$requiredVars = @(
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY", 
    "SUPABASE_SERVICE_ROLE_KEY"
)

$missingVars = @()
foreach ($var in $requiredVars) {
    $value = [Environment]::GetEnvironmentVariable($var, "Process")
    if (-not $value -or $value -eq "your_supabase_project_url" -or $value -eq "your_supabase_anon_key" -or $value -eq "your_supabase_service_role_key") {
        $missingVars += $var
        Write-Host "❌ Missing or template value: $var" -ForegroundColor Red
    } else {
        Write-Host "✅ Configured: $var" -ForegroundColor Green
    }
}

if ($missingVars.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  CONFIGURATION REQUIRED" -ForegroundColor Yellow
    Write-Host "Please update $existingEnv with your actual Supabase credentials:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Go to https://supabase.com/dashboard" -ForegroundColor Cyan
    Write-Host "2. Select your project" -ForegroundColor Cyan
    Write-Host "3. Go to Settings > API" -ForegroundColor Cyan
    Write-Host "4. Copy the Project URL and keys to $existingEnv" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Missing variables:" -ForegroundColor Red
    $missingVars | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host ""
    Write-Host "After updating the file, run this script again." -ForegroundColor Yellow
    exit 1
}

# Construct DATABASE_URL if not present
$databaseUrl = [Environment]::GetEnvironmentVariable("DATABASE_URL", "Process")
if (-not $databaseUrl -or $databaseUrl -eq "postgresql://user:password@localhost:5432/celora") {
    $supabaseUrl = [Environment]::GetEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL", "Process")
    
    if ($supabaseUrl -match 'https://([^.]+)\.supabase\.co') {
        $projectRef = $matches[1]
        $serviceKey = [Environment]::GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY", "Process")
        
        # Extract password from service role key (first 32 chars for simplicity)
        $dbPassword = $serviceKey.Substring(0, [Math]::Min(32, $serviceKey.Length))
        
        $constructedDbUrl = "postgresql://postgres.${projectRef}:${dbPassword}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
        
        Write-Host ""
        Write-Host "🔧 Constructed DATABASE_URL from Supabase config:" -ForegroundColor Yellow
        Write-Host "DATABASE_URL=$constructedDbUrl" -ForegroundColor Gray
        Write-Host ""
        Write-Host "⚠️  Please verify this is correct and update $existingEnv if needed." -ForegroundColor Yellow
        Write-Host "You can find the exact connection string in Supabase Dashboard > Settings > Database" -ForegroundColor Cyan
        
        # Set for this session
        [Environment]::SetEnvironmentVariable("DATABASE_URL", $constructedDbUrl, "Process")
        
        # Ask user to confirm
        $confirm = Read-Host "Continue with this DATABASE_URL? (y/n)"
        if ($confirm -ne "y" -and $confirm -ne "Y") {
            Write-Host "Please update DATABASE_URL in $existingEnv and run again." -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "❌ Could not construct DATABASE_URL automatically." -ForegroundColor Red
        Write-Host "Please add DATABASE_URL to $existingEnv manually." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Environment configuration validated!" -ForegroundColor Green
Write-Host ""

# Test database connection
Write-Host "🔗 Testing database connection..." -ForegroundColor Yellow
$testCommand = "node -e `"const { Client } = require('pg'); const client = new Client('$databaseUrl'); client.connect().then(() => { console.log('✅ Connection successful'); client.end(); }).catch(err => { console.error('❌ Connection failed:', err.message); process.exit(1); })`""

try {
    Invoke-Expression $testCommand
    Write-Host "✅ Database connection verified!" -ForegroundColor Green
} catch {
    Write-Host "❌ Database connection failed!" -ForegroundColor Red
    Write-Host "Please verify your DATABASE_URL and network connectivity." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🚀 Environment setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: .\scripts\migrate-database-phase1.ps1" -ForegroundColor Cyan
Write-Host "2. Run: npm run build" -ForegroundColor Cyan
Write-Host "3. Run: npm run start" -ForegroundColor Cyan
Write-Host ""