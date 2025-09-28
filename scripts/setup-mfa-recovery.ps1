# Setup MFA Recovery System
# This script helps set up the MFA recovery system in your PostgreSQL database

# Load environment variables from .env file
$envFile = ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#].*?)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$key" -Value $value
        }
    }
}

# Database connection details
$dbHost = $env:DATABASE_HOST
$dbPort = $env:DATABASE_PORT
$dbName = $env:DATABASE_NAME
$dbUser = $env:DATABASE_USER
$dbPassword = $env:DATABASE_PASSWORD

# If the environment variables are not set, use default values
if (!$dbHost) { $dbHost = "localhost" }
if (!$dbPort) { $dbPort = "5432" }
if (!$dbName) { $dbName = "postgres" }
if (!$dbUser) { $dbUser = "postgres" }

# Check if we have the required information
if (!$dbPassword) {
    $dbPassword = Read-Host -Prompt "Enter database password" -AsSecureString
    $dbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))
}

# Function to execute SQL file
function Execute-SQLFile {
    param(
        [string]$sqlFile
    )
    
    Write-Host "Executing SQL file: $sqlFile" -ForegroundColor Cyan
    
    # Check if psql command is available
    $psqlCommand = Get-Command psql -ErrorAction SilentlyContinue
    
    if ($psqlCommand) {
        # Use psql command
        $env:PGPASSWORD = $dbPassword
        $result = psql -h $dbHost -p $dbPort -d $dbName -U $dbUser -f $sqlFile
        $env:PGPASSWORD = ""
        return $result
    } else {
        # Use Supabase CLI if available
        $supabaseCommand = Get-Command supabase -ErrorAction SilentlyContinue
        
        if ($supabaseCommand) {
            $result = supabase db execute --file $sqlFile
            return $result
        } else {
            Write-Host "Neither psql nor supabase CLI found. Please install one of them to proceed." -ForegroundColor Red
            exit 1
        }
    }
}

# Main execution
try {
    Write-Host "Setting up MFA Recovery System..." -ForegroundColor Green
    
    # Execute the SQL files
    Execute-SQLFile ".\database\mfa-recovery.sql"
    
    Write-Host "`nMFA Recovery System setup complete!" -ForegroundColor Green
    
    # Create test user if requested
    $createTestUser = Read-Host "Do you want to create a test user with MFA enabled? (y/n)"
    
    if ($createTestUser -eq "y") {
        $testEmail = Read-Host "Enter test user email"
        $testPassword = Read-Host "Enter test user password" -AsSecureString
        $testPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($testPassword))
        
        Write-Host "Creating test user and enabling MFA..." -ForegroundColor Cyan
        
        # Create SQL for test user
        $testUserSql = @"
-- Create test user
DO `$`$
DECLARE
    v_user_id uuid;
BEGIN
    -- Create user in auth schema
    INSERT INTO auth.users (email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, encrypted_password)
    VALUES ('$testEmail', now(), '{"provider": "email", "mfa_enabled": true}', '{"full_name": "Test MFA User"}', auth.crypt('$testPassword', auth.gen_salt('bf')))
    RETURNING id INTO v_user_id;
    
    -- Create user profile
    INSERT INTO public.user_profiles (id, email, full_name, mfa_enabled, mfa_secret)
    VALUES (v_user_id, '$testEmail', 'Test MFA User', true, 'JBSWY3DPEHPK3PXP');
    
    -- Generate recovery codes
    INSERT INTO public.mfa_recovery_codes (user_id, code)
    VALUES 
        (v_user_id, 'AAAA-BBBB-CCCC-DDDD'),
        (v_user_id, 'EEEE-FFFF-GGGG-HHHH'),
        (v_user_id, 'IIII-JJJJ-KKKK-LLLL');
        
    RAISE NOTICE 'Created test user with ID: %', v_user_id;
END
`$`$;
"@
        
        # Save SQL to temporary file and execute
        $tempFile = New-TemporaryFile
        $testUserSql | Out-File -FilePath $tempFile -Encoding utf8
        Execute-SQLFile $tempFile
        Remove-Item $tempFile
        
        Write-Host "`nTest user created with MFA enabled!" -ForegroundColor Green
        Write-Host "Email: $testEmail" -ForegroundColor Yellow
        Write-Host "TOTP Secret: JBSWY3DPEHPK3PXP" -ForegroundColor Yellow
        Write-Host "Recovery Codes: AAAA-BBBB-CCCC-DDDD, EEEE-FFFF-GGGG-HHHH, IIII-JJJJ-KKKK-LLLL" -ForegroundColor Yellow
        Write-Host "You can use Google Authenticator or similar app to set up TOTP with this secret." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Error setting up MFA Recovery System: $_" -ForegroundColor Red
    exit 1
}