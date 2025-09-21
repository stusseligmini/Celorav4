import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import { loadEnv, parseFeatureFlags } from '../env';

// Mock process.env for testing
const originalEnv = process.env;

describe('loadEnv', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('loads required environment variables', () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.LOG_LEVEL = 'info';

    const env = loadEnv();

    expect(env.SUPABASE_URL).toBe('https://test.supabase.co');
    expect(env.SUPABASE_ANON_KEY).toBe('test-anon-key');
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('handles optional environment variables', () => {
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-anon-key';
    // LOG_LEVEL not set

    const env = loadEnv();

    expect(env.SUPABASE_URL).toBe('https://test.supabase.co');
    expect(env.SUPABASE_ANON_KEY).toBe('test-anon-key');
    expect(env.LOG_LEVEL).toBe('info'); // default value
  });

  it('falls back gracefully in browser environment', () => {
    // Simulate browser environment
    Object.defineProperty(global, 'window', {
      value: {},
      configurable: true
    });

    const env = loadEnv();

    expect(env).toBeDefined();
    // In browser, should use defaults or fail gracefully
    
    // Cleanup
    delete (global as any).window;
  });

  it('validates feature flags format', () => {
    process.env.FEATURE_FLAGS = 'flag1=true,flag2=false,flag3=true';

    const env = loadEnv();
    const flags = env.FEATURE_FLAGS;

    expect(flags).toBeDefined();
    expect(flags).toEqual('flag1=true,flag2=false,flag3=true');
    
    // Test the parsing function
    const parsed = parseFeatureFlags(flags);
    expect(parsed).toHaveProperty('flag1', true);
    expect(parsed).toHaveProperty('flag2', false);
    expect(parsed).toHaveProperty('flag3', true);
  });
});