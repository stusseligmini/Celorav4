import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(), // for server-side operations
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  FEATURE_FLAGS: z.string().optional() // comma-separated key=true/false
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  
  // In browser environment, skip validation and return defaults
  if (typeof window !== 'undefined') {
    cached = {
      NODE_ENV: 'development' as const,
      LOG_LEVEL: 'info' as const,
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

export function parseFeatureFlags(raw?: string): Record<string, boolean> {
  if (!raw) return {};
  return raw.split(',').reduce<Record<string, boolean>>((acc, pair) => {
    const [k, v] = pair.split('=');
    if (k) acc[k.trim()] = v?.trim() === 'true';
    return acc;
  }, {});
}
