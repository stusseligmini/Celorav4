// Test environment setup
import { beforeAll } from 'vitest';

beforeAll(() => {
  // Set up mock environment variables for testing
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.FEATURE_FLAGS = 'flag1=true,flag2=false,flag3=true';
  process.env.LOG_LEVEL = 'error'; // Suppress logs during tests
});