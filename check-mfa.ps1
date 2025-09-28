# Celora MFA Status Check Script
param(
    [switch]$Force = $false
)

Write-Host "🔐 Celora MFA Status Check Starting..." -ForegroundColor Cyan

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

# Check for MFA column in user_profiles
Write-Host "🔍 Checking for MFA columns..." -ForegroundColor Blue
$mfaColsQuery = @"
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_profiles'
        AND column_name = 'mfa_enabled'
    ) THEN 'MFA columns exist' ELSE 'MFA columns missing' END as mfa_status,
    CASE WHEN EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mfa_verification_log'
    ) THEN 'MFA log table exists' ELSE 'MFA log table missing' END as log_status,
    CASE WHEN EXISTS (
        SELECT 1 
        FROM pg_proc 
        WHERE proname = 'generate_recovery_codes'
    ) THEN 'Recovery code function exists' ELSE 'Recovery code function missing' END as function_status;
"@

$mfaStatus = Invoke-SupabaseSQL -SqlContent $mfaColsQuery

if ($mfaStatus) {
    # Check the results
    if ($mfaStatus[0].mfa_status -eq "MFA columns exist") {
        Write-Host "✅ MFA columns found in user_profiles table" -ForegroundColor Green
    } else {
        Write-Host "❌ MFA columns NOT found in user_profiles table" -ForegroundColor Red
        Write-Host "   Run 'database\deploy-mfa.sql' to install MFA functionality" -ForegroundColor Yellow
    }
    
    if ($mfaStatus[0].log_status -eq "MFA log table exists") {
        Write-Host "✅ MFA verification log table exists" -ForegroundColor Green
    } else {
        Write-Host "❌ MFA verification log table NOT found" -ForegroundColor Red
    }
    
    if ($mfaStatus[0].function_status -eq "Recovery code function exists") {
        Write-Host "✅ MFA recovery code functions exist" -ForegroundColor Green
    } else {
        Write-Host "❌ MFA recovery code functions NOT found" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Could not verify MFA status" -ForegroundColor Red
}

# Check user MFA statuses if basic setup is successful
if ($mfaStatus -and 
    $mfaStatus[0].mfa_status -eq "MFA columns exist" -and 
    $mfaStatus[0].log_status -eq "MFA log table exists") {
    
    Write-Host "🔍 Checking user MFA statuses..." -ForegroundColor Blue
    
    $userMfaQuery = @"
    SELECT 
        count(*) as total_users,
        count(CASE WHEN mfa_enabled = true THEN 1 END) as mfa_enabled_count,
        ROUND(count(CASE WHEN mfa_enabled = true THEN 1 END)::numeric / count(*)::numeric * 100, 1) as mfa_adoption_percent
    FROM public.user_profiles;
"@
    
    $userMfaStatus = Invoke-SupabaseSQL -SqlContent $userMfaQuery
    
    if ($userMfaStatus -and $userMfaStatus[0].total_users -gt 0) {
        Write-Host "📊 MFA Adoption Statistics:" -ForegroundColor Cyan
        Write-Host "   Total users: $($userMfaStatus[0].total_users)" -ForegroundColor White
        Write-Host "   Users with MFA enabled: $($userMfaStatus[0].mfa_enabled_count)" -ForegroundColor White
        Write-Host "   MFA adoption rate: $($userMfaStatus[0].mfa_adoption_percent)%" -ForegroundColor $(if ($userMfaStatus[0].mfa_adoption_percent -ge 50) { "Green" } elseif ($userMfaStatus[0].mfa_adoption_percent -gt 0) { "Yellow" } else { "Red" })
    } else {
        Write-Host "ℹ️ No users found in the database yet" -ForegroundColor Blue
    }
}

Write-Host ""
Write-Host "🎉 MFA Status Check Completed!" -ForegroundColor Cyan
Write-Host ""