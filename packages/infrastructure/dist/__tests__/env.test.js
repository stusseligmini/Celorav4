"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const env_1 = require("../env");
// Mock process.env for testing
const originalEnv = process.env;
(0, vitest_1.describe)('loadEnv', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.resetModules();
        process.env = { ...originalEnv };
    });
    (0, vitest_1.afterAll)(() => {
        process.env = originalEnv;
    });
    (0, vitest_1.it)('loads required environment variables', () => {
        process.env.SUPABASE_URL = 'https://test.supabase.co';
        process.env.SUPABASE_ANON_KEY = 'test-anon-key';
        process.env.LOG_LEVEL = 'info';
        const env = (0, env_1.loadEnv)();
        (0, vitest_1.expect)(env.SUPABASE_URL).toBe('https://test.supabase.co');
        (0, vitest_1.expect)(env.SUPABASE_ANON_KEY).toBe('test-anon-key');
        (0, vitest_1.expect)(env.LOG_LEVEL).toBe('info');
    });
    (0, vitest_1.it)('handles optional environment variables', () => {
        process.env.SUPABASE_URL = 'https://test.supabase.co';
        process.env.SUPABASE_ANON_KEY = 'test-anon-key';
        // LOG_LEVEL not set
        const env = (0, env_1.loadEnv)();
        (0, vitest_1.expect)(env.SUPABASE_URL).toBe('https://test.supabase.co');
        (0, vitest_1.expect)(env.SUPABASE_ANON_KEY).toBe('test-anon-key');
        (0, vitest_1.expect)(env.LOG_LEVEL).toBe('info'); // default value
    });
    (0, vitest_1.it)('falls back gracefully in browser environment', () => {
        // Simulate browser environment
        Object.defineProperty(global, 'window', {
            value: {},
            configurable: true
        });
        const env = (0, env_1.loadEnv)();
        (0, vitest_1.expect)(env).toBeDefined();
        // In browser, should use defaults or fail gracefully
        // Cleanup
        delete global.window;
    });
    (0, vitest_1.it)('validates feature flags format', () => {
        process.env.FEATURE_FLAGS = 'flag1:true,flag2:false,flag3:true';
        const env = (0, env_1.loadEnv)();
        const flags = env.FEATURE_FLAGS;
        (0, vitest_1.expect)(flags).toContain('flag1:true');
        (0, vitest_1.expect)(flags).toContain('flag2:false');
        (0, vitest_1.expect)(flags).toContain('flag3:true');
    });
});
