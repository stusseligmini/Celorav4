# Celora Production Setup
Write-Host "CELORA SOLANA PRODUCTION SETUP" -ForegroundColor Green

# Generate encryption key
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$encryptionKey = [Convert]::ToBase64String($bytes)

# Create .env.local
$envContent = @"
# Celora Production Environment
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key_here

NEXTAUTH_SECRET=your_generated_secret_here
NEXTAUTH_URL=http://localhost:3000

ENCRYPTION_KEY=$encryptionKey

# QuikNode Solana Mainnet
SOLANA_RPC_URL=https://frequent-omniscient-surf.solana-mainnet.quiknode.pro/d6f886165a763e470e3ee91ad58edf746f87d295
SOLANA_WSS_URL=wss://frequent-omniscient-surf.solana-mainnet.quiknode.pro/d6f886165a763e470e3ee91ad58edf746f87d295

ENABLE_REAL_BLOCKCHAIN=true
NODE_ENV=production
"@

$envContent | Out-File -FilePath ".env.local" -Encoding UTF8

Write-Host "Configuration created successfully!" -ForegroundColor Green
Write-Host "QuikNode Solana endpoints are now active" -ForegroundColor Cyan