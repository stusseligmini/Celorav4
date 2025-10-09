# Script to add all environment variables to Vercel Production
# Run this after installing Vercel CLI: npm i -g vercel

Write-Host "Setting Vercel Production Environment Variables..." -ForegroundColor Cyan

# Check if vercel CLI is installed
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "Error: Vercel CLI not found. Install it first:" -ForegroundColor Red
    Write-Host "npm i -g vercel" -ForegroundColor Yellow
    exit 1
}

# Project name (adjust if needed)
$PROJECT = "celorav4"

# Array of environment variables
$envVars = @(
    @{name="NEXT_PUBLIC_SUPABASE_URL"; value="https://zpcycakwdvymqhwvakrv.supabase.co"},
    @{name="NEXT_PUBLIC_SUPABASE_ANON_KEY"; value="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3ljYWt3ZHZ5bXFod3Zha3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0NjIyNzYsImV4cCI6MjA3NDAzODI3Nn0.tAzcxbTBV67ubzkZLTVlwBpZEqbLQoze6JbgYtYXFQI"},
    @{name="SUPABASE_SERVICE_ROLE_KEY"; value="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwY3ljYWt3ZHZ5bXFod3Zha3J2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQ2MjI3NiwiZXhwIjoyMDc0MDM4Mjc2fQ.cfMRjZMHfQ3Y6jlTVvYaP9GTnWq-WBwyoXWuFVcVwoQ"},
    @{name="NEXTAUTH_SECRET"; value="PoXoGyzZ+HGLkJaTT9k/zhoJxAgh7b6Psi3XF86g8Ho="},
    @{name="NEXTAUTH_URL"; value="https://www.celora.net"},
    @{name="JWT_SECRET"; value="wT1n+aefAvljmlRf6SOKlOOf9pF7fwpO4FLSVjjYLjUZqYktUfOILls0K/wxLmB6xOzFUB+xXdSQ3gbpi5UtYQ=="},
    @{name="WALLET_ENCRYPTION_KEY"; value="f6cGWbwGkCF7ObTLieQE45cBakD84IuFayxMp+O2DkY="},
    @{name="SEED_PHRASE_ENCRYPTION_KEY"; value="PcqnptkvdUOYhKqBy1UqQ5CvPdrryvxa/Cx2QBlv0ow="},
    @{name="MASTER_ENCRYPTION_KEY"; value="Bc8xUvOJcuu/yv1/W5tzjkrU3+UDJZM/XMVaRG0uYkU="},
    @{name="BACKUP_ENCRYPTION_KEY"; value="Bc8xUvOJcuu/yv1/W5tzjkrU3+UDJZM/XMVaRG0uYkU="},
    @{name="API_SECRET_KEY"; value="80675c1a6a43feb04605de73a188334ce97472926fc053d6d2aea645788b6e7e"},
    @{name="SOLANA_RPC_URL"; value="https://frequent-omniscient-surf.solana-mainnet.quiknode.pro/d6f886165a763e470e3ee91ad58edf746f87d295"},
    @{name="SOLANA_WSS_URL"; value="wss://frequent-omniscient-surf.solana-mainnet.quiknode.pro/d6f886165a763e470e3ee91ad58edf746f87d295"},
    @{name="ENABLE_REAL_BLOCKCHAIN"; value="true"},
    @{name="NODE_ENV"; value="production"}
)

Write-Host "`nAdding $($envVars.Count) environment variables to Production..." -ForegroundColor Yellow

foreach ($env in $envVars) {
    Write-Host "Setting $($env.name)..." -ForegroundColor Gray
    
    # Use vercel env add command
    # Note: This requires manual confirmation in CLI
    $output = echo $env.value | vercel env add $env.name production --force 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ $($env.name) set" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Failed to set $($env.name): $output" -ForegroundColor Red
    }
}

Write-Host "`n✅ Done! Remember to redeploy your project:" -ForegroundColor Green
Write-Host "vercel --prod" -ForegroundColor Cyan
