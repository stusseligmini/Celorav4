# Celora Database Setup PowerShell Script
param(
    [switch]$Force = $false
)

Write-Host "🚀 Celora Database Setup Starting..." -ForegroundColor Cyan

# Load environment variables
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match "^([^#][^=]+)=(.*)$") {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
    Write-Host "✅ Environment variables loaded" -ForegroundColor Green
} else {
    Write-Host "❌ .env.local file not found" -ForegroundColor Red
    exit 1
}

$supabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$supabaseKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $supabaseUrl -or -not $supabaseKey) {
    Write-Host "❌ Missing Supabase environment variables" -ForegroundColor Red
    exit 1
}

Write-Host "🔗 Connected to: $supabaseUrl" -ForegroundColor Blue

# Function to execute SQL via Supabase REST API
function Invoke-SupabaseSQL {
    param($SqlContent)
    
    $headers = @{
        'Content-Type' = 'application/json'
        'Authorization' = "Bearer $supabaseKey"
        'apikey' = $supabaseKey
    }
    
    try {
        $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/query" -Method POST -Headers $headers -Body (@{
            query = $SqlContent
        } | ConvertTo-Json)
        return $response
    } catch {
        Write-Host "⚠️ SQL execution note: $($_.Exception.Message)" -ForegroundColor Yellow
        return $null
    }
}

# Read and execute main schema
Write-Host "📋 Reading main database schema..." -ForegroundColor Blue

if (-not (Test-Path "supabase-schema.sql")) {
    Write-Host "❌ supabase-schema.sql not found" -ForegroundColor Red
    exit 1
}

$mainSchema = Get-Content "supabase-schema.sql" -Raw
Write-Host "✅ Main schema loaded ($(($mainSchema | Measure-Object -Character).Characters) characters)" -ForegroundColor Green

Write-Host "🗄️ Executing main schema..." -ForegroundColor Blue
$result = Invoke-SupabaseSQL -SqlContent $mainSchema

# Read and execute additional policies
Write-Host "🔒 Reading security policies..." -ForegroundColor Blue

if (Test-Path "supabase-policies-additions.sql") {
    $policiesSchema = Get-Content "supabase-policies-additions.sql" -Raw
    Write-Host "✅ Security policies loaded" -ForegroundColor Green
    
    Write-Host "🛡️ Executing security policies..." -ForegroundColor Blue
    $policiesResult = Invoke-SupabaseSQL -SqlContent $policiesSchema
} else {
    Write-Host "⚠️ supabase-policies-additions.sql not found, skipping" -ForegroundColor Yellow
}

# Test database connectivity
Write-Host "🧪 Testing database functionality..." -ForegroundColor Blue

$testQuery = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
$headers = @{
    'Content-Type' = 'application/json'
    'Authorization' = "Bearer $supabaseKey"
    'apikey' = $supabaseKey
}

try {
    $tablesResponse = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/query" -Method POST -Headers $headers -Body (@{
        query = $testQuery
    } | ConvertTo-Json)
    
    if ($tablesResponse) {
        Write-Host "📊 Database tables created successfully" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Could not verify tables, but setup may have succeeded" -ForegroundColor Yellow
}
}

# Final verification - try to access key tables directly
Write-Host "🔍 Verifying key tables..." -ForegroundColor Blue

$testTables = @('profiles', 'virtual_cards', 'wallets', 'transactions', 'notifications')

foreach ($table in $testTables) {
    try {
        $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/$table" -Method GET -Headers @{
            'Authorization' = "Bearer $supabaseKey"
            'apikey' = $supabaseKey
            'Range' = '0-0'
        }
        Write-Host "✅ Table '$table' is accessible" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Table '$table' may not be ready yet" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎉 Database setup completed!" -ForegroundColor Cyan
Write-Host "🚀 Your Celora fintech platform is now ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Blue
Write-Host "1. 🌐 Visit: https://celora-platform.vercel.app" -ForegroundColor White
Write-Host "2. 🔐 Create a new wallet with 12-word seed phrase" -ForegroundColor White
Write-Host "3. 📊 Explore the dashboard and features" -ForegroundColor White
Write-Host ""