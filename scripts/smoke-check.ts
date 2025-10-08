/*
  Minimal pre-deploy smoke check.
  - Verifies required env vars exist
  - Validates Next public env for Supabase
  - Exits with non-zero code on failure
*/

const requiredPublic = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];
const requiredSecretsProd = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'WALLET_ENCRYPTION_KEY',
  // optional but recommended
  // 'SEED_PHRASE_ENCRYPTION_KEY',
];

function fail(msg: string): never {
  console.error(`❌ Smoke check failed: ${msg}`);
  process.exit(1);
}

function ok(msg: string) {
  console.log(`✅ ${msg}`);
}

// Check required public envs (they must be present at build time for client)
for (const key of requiredPublic) {
  if (!process.env[key] || String(process.env[key]).trim() === '') {
    fail(`Missing environment variable ${key}`);
  }
}

// Basic URL sanity
try {
  new URL(String(process.env.NEXT_PUBLIC_SUPABASE_URL));
} catch {
  fail('NEXT_PUBLIC_SUPABASE_URL is not a valid URL');
}

ok('Environment looks good');

// Additional strict checks for production deploys
if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
  for (const key of requiredSecretsProd) {
    if (!process.env[key] || String(process.env[key]).trim() === '') {
      fail(`Missing required secret in production: ${key}`);
    }
  }
  // ENCRYPTION_KEY must be 32 bytes (64 hex)
  const enc = process.env.ENCRYPTION_KEY || process.env.WALLET_ENCRYPTION_KEY;
  if (!enc) fail('Missing ENCRYPTION_KEY or WALLET_ENCRYPTION_KEY in production');
  const isHex64 = /^[a-fA-F0-9]{64}$/.test(String(enc));
  if (!isHex64) fail('ENCRYPTION_KEY/WALLET_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
}

ok('Production checks passed (or not required)');
