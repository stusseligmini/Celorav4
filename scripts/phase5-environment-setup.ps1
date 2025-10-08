# Environment Setup & Validation Script
# PHASE 5: Production Environment Configuration

Write-Host "🚀 PHASE 5: ENVIRONMENT SETUP & VALIDATION" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Create comprehensive .env.production template
Write-Host "📝 Creating production environment template..." -ForegroundColor Yellow

$envProduction = @'
# CELORA PRODUCTION ENVIRONMENT CONFIGURATION
# Generated: 2025-10-05
# Phase 5: Environment Setup

# ===========================================
# CORE APPLICATION SETTINGS
# ===========================================
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_URL=https://celora.app
NEXT_PUBLIC_API_URL=https://api.celora.app

# ===========================================
# SUPABASE CONFIGURATION
# ===========================================
# Get these from your Supabase project dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Database URLs (from Supabase dashboard)
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
POSTGRES_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# ===========================================
# AUTHENTICATION & SECURITY
# ===========================================
# Generate with: openssl rand -base64 32
JWT_SECRET=your_jwt_secret_256_bit_key
NEXTAUTH_SECRET=your_nextauth_secret_256_bit_key
NEXTAUTH_URL=https://celora.app

# Wallet & Seed Phrase Encryption (CRITICAL FOR PRODUCTION)
# Generate with: openssl rand -base64 32
WALLET_ENCRYPTION_KEY=your_wallet_encryption_master_key
SEED_PHRASE_ENCRYPTION_KEY=your_seed_phrase_encryption_key

# ===========================================
# BLOCKCHAIN INTEGRATION
# ===========================================
# Ethereum Configuration
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID
ETHEREUM_TESTNET_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
INFURA_PROJECT_ID=your_infura_project_id
ETHEREUM_PRIVATE_KEY=your_ethereum_private_key_for_operations

# Solana Configuration  
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_TESTNET_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=your_solana_private_key_base58

# Bitcoin Configuration
BITCOIN_RPC_URL=https://bitcoin-rpc.example.com
BITCOIN_TESTNET_RPC_URL=https://testnet-bitcoin-rpc.example.com
BITCOIN_PRIVATE_KEY=your_bitcoin_private_key_wif

# ===========================================
# API SECURITY & RATE LIMITING
# ===========================================
API_SECRET_KEY=your_internal_api_secret_key
API_RATE_LIMIT=100
API_RATE_WINDOW_MS=60000

# CORS Configuration
CORS_ORIGIN=https://celora.app
ALLOWED_DOMAINS=celora.app,www.celora.app,api.celora.app

# ===========================================
# FEATURE FLAGS (PRODUCTION VALUES)
# ===========================================
ENABLE_VIRTUAL_CARDS=true
ENABLE_CRYPTO_WALLETS=true
ENABLE_CROSS_PLATFORM_TRANSFERS=true
ENABLE_RISK_SCORING=true
ENABLE_PIN_PROTECTION=true
ENABLE_AUDIT_LOGGING=true
ENABLE_MFA_RECOVERY=true
ENABLE_QUANTUM_RESISTANCE=false

# ===========================================
# EXTERNAL SERVICES & MONITORING
# ===========================================
# Notification Services
PUSH_NOTIFICATION_KEY=your_push_notification_service_key
EMAIL_SERVICE_KEY=your_email_service_api_key

# Monitoring & Analytics
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
ANALYTICS_KEY=your_analytics_service_key
LOG_LEVEL=info

# ===========================================
# DEPLOYMENT & SCALING
# ===========================================
VERCEL_ENV=production
DEPLOYMENT_REGION=us-east-1
CDN_URL=https://cdn.celora.app

# Performance Settings
MAX_CONCURRENT_REQUESTS=1000
DATABASE_POOL_SIZE=20
CACHE_TTL_SECONDS=3600

# ===========================================
# BACKUP & RECOVERY
# ===========================================
BACKUP_ENCRYPTION_KEY=your_backup_encryption_key
BACKUP_RETENTION_DAYS=90
DISASTER_RECOVERY_REGION=us-west-2

# ===========================================
# COMPLIANCE & AUDITING  
# ===========================================
AUDIT_LOG_RETENTION_DAYS=365
COMPLIANCE_MODE=SOC2_TYPE2
KYC_PROVIDER_KEY=your_kyc_provider_api_key
AML_PROVIDER_KEY=your_aml_provider_api_key
'@

# Write production environment template
$envProduction | Out-File -FilePath ".env.production" -Encoding UTF8
Write-Host "✅ Created .env.production template" -ForegroundColor Green

# Create environment validation script
Write-Host "📝 Creating environment validation script..." -ForegroundColor Yellow

$envValidation = @'
// Environment Validation Script - Phase 5
// Validates all required environment variables for production

const requiredEnvVars = {
  // Core Application
  'NODE_ENV': 'Application environment',
  'NEXT_PUBLIC_APP_URL': 'Application URL',
  
  // Supabase (Critical)
  'NEXT_PUBLIC_SUPABASE_URL': 'Supabase project URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'Supabase anonymous key',
  'SUPABASE_SERVICE_ROLE_KEY': 'Supabase service role key (server operations)',
  
  // Security (Critical)
  'JWT_SECRET': 'JWT signing secret',
  'WALLET_ENCRYPTION_KEY': 'Wallet backup encryption key',
  'SEED_PHRASE_ENCRYPTION_KEY': 'Seed phrase encryption key',
  
  // Blockchain (Required for crypto features)
  'ETHEREUM_RPC_URL': 'Ethereum RPC endpoint',
  'SOLANA_RPC_URL': 'Solana RPC endpoint',
  'BITCOIN_RPC_URL': 'Bitcoin RPC endpoint',
  
  // API Security
  'API_SECRET_KEY': 'Internal API secret key',
  'CORS_ORIGIN': 'CORS allowed origins'
};

const optionalEnvVars = {
  'INFURA_PROJECT_ID': 'Infura project ID (for Ethereum)',
  'SENTRY_DSN': 'Sentry error monitoring',
  'ANALYTICS_KEY': 'Analytics service key',
  'LOG_LEVEL': 'Application log level'
};

function validateEnvironment() {
  console.log('🔍 CELORA ENVIRONMENT VALIDATION');
  console.log('=================================');
  
  let isValid = true;
  const missing = [];
  const present = [];
  
  // Check required variables
  console.log('\n📋 Required Environment Variables:');
  for (const [key, description] of Object.entries(requiredEnvVars)) {
    const value = process.env[key];
    if (!value) {
      console.log(`❌ ${key} - ${description}`);
      missing.push(key);
      isValid = false;
    } else {
      console.log(`✅ ${key} - ${description}`);
      present.push(key);
    }
  }
  
  // Check optional variables
  console.log('\n🔧 Optional Environment Variables:');
  for (const [key, description] of Object.entries(optionalEnvVars)) {
    const value = process.env[key];
    if (!value) {
      console.log(`⚠️  ${key} - ${description} (optional)`);
    } else {
      console.log(`✅ ${key} - ${description}`);
    }
  }
  
  // Security validation
  console.log('\n🔐 Security Validation:');
  const securityChecks = validateSecurity();
  if (!securityChecks.valid) {
    isValid = false;
  }
  
  // Summary
  console.log('\n📊 VALIDATION SUMMARY:');
  console.log(`✅ Required variables present: ${present.length}/${Object.keys(requiredEnvVars).length}`);
  if (missing.length > 0) {
    console.log(`❌ Missing required variables: ${missing.length}`);
    console.log(`   Missing: ${missing.join(', ')}`);
  }
  
  if (isValid) {
    console.log('\n🎉 ENVIRONMENT VALIDATION PASSED!');
    console.log('✅ All required environment variables are configured');
    console.log('✅ Security requirements met');
    console.log('🚀 System is ready for production deployment');
  } else {
    console.log('\n❌ ENVIRONMENT VALIDATION FAILED!');
    console.log('Please configure all missing environment variables before deployment.');
    process.exit(1);
  }
  
  return isValid;
}

function validateSecurity() {
  const checks = {
    valid: true,
    issues: []
  };
  
  // Check JWT secret strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    console.log('⚠️  JWT_SECRET should be at least 32 characters for security');
    checks.issues.push('Weak JWT secret');
  } else if (jwtSecret) {
    console.log('✅ JWT_SECRET strength is adequate');
  }
  
  // Check wallet encryption key
  const walletKey = process.env.WALLET_ENCRYPTION_KEY;
  if (walletKey && walletKey.length < 32) {
    console.log('❌ WALLET_ENCRYPTION_KEY must be at least 32 characters');
    checks.valid = false;
    checks.issues.push('Weak wallet encryption key');
  } else if (walletKey) {
    console.log('✅ WALLET_ENCRYPTION_KEY strength is adequate');
  }
  
  // Check for development values in production
  if (process.env.NODE_ENV === 'production') {
    const devIndicators = [
      'localhost', '127.0.0.1', 'example.com', 'your-domain', 
      'test-key', 'dev-key', 'placeholder'
    ];
    
    for (const [key, value] of Object.entries(process.env)) {
      if (value && devIndicators.some(indicator => value.toLowerCase().includes(indicator))) {
        console.log(`⚠️  ${key} appears to contain development/placeholder values`);
        checks.issues.push(`Development value in ${key}`);
      }
    }
  }
  
  if (checks.valid) {
    console.log('✅ Security validation passed');
  } else {
    console.log(`❌ Security issues found: ${checks.issues.join(', ')}`);
  }
  
  return checks;
}

// Run validation if called directly
if (require.main === module) {
  require('dotenv').config({ path: '.env.local' });
  require('dotenv').config({ path: '.env.production' });
  validateEnvironment();
}

module.exports = { validateEnvironment, validateSecurity };
'@

$envValidation | Out-File -FilePath "scripts/validate-environment.js" -Encoding UTF8
Write-Host "✅ Created environment validation script" -ForegroundColor Green

# Run environment validation on current setup
Write-Host "🔍 Validating current environment..." -ForegroundColor Yellow
try {
    node scripts/validate-environment.js
} catch {
    Write-Host "⚠️  Environment validation script created but needs Node.js to run" -ForegroundColor Yellow
    Write-Host "   Run 'node scripts/validate-environment.js' to validate environment" -ForegroundColor Yellow
}

Write-Host "✅ Phase 5 Environment Setup - Initial configuration complete!" -ForegroundColor Green
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Review .env.production template" -ForegroundColor White
Write-Host "   2. Configure your actual environment values" -ForegroundColor White  
Write-Host "   3. Run 'node scripts/validate-environment.js' to validate" -ForegroundColor White
Write-Host "   4. Install blockchain dependencies" -ForegroundColor White