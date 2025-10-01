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
