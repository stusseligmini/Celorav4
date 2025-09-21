"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnv = loadEnv;
exports.parseFeatureFlags = parseFeatureFlags;
const zod_1 = require("zod");
const EnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'staging', 'production']).default('development'),
    SUPABASE_URL: zod_1.z.string().url().optional(),
    SUPABASE_ANON_KEY: zod_1.z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().optional(), // for server-side operations
    LOG_LEVEL: zod_1.z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    FEATURE_FLAGS: zod_1.z.string().optional() // comma-separated key=true/false
});
let cached = null;
function loadEnv() {
    if (cached)
        return cached;
    // In browser environment, skip validation and return defaults
    if (typeof window !== 'undefined') {
        cached = {
            NODE_ENV: 'development',
            LOG_LEVEL: 'info',
        };
        return cached;
    }
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
        console.error('Invalid environment variables', parsed.error.flatten());
        throw new Error('ENV_VALIDATION_FAILED');
    }
    cached = parsed.data;
    return cached;
}
function parseFeatureFlags(raw) {
    if (!raw)
        return {};
    return raw.split(',').reduce((acc, pair) => {
        const [k, v] = pair.split('=');
        if (k)
            acc[k.trim()] = v?.trim() === 'true';
        return acc;
    }, {});
}
