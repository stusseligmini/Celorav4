import { z } from 'zod';
declare const EnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "staging", "production"]>>;
    SUPABASE_URL: z.ZodOptional<z.ZodString>;
    SUPABASE_ANON_KEY: z.ZodOptional<z.ZodString>;
    SUPABASE_SERVICE_ROLE_KEY: z.ZodOptional<z.ZodString>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    FEATURE_FLAGS: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NODE_ENV: "development" | "test" | "staging" | "production";
    LOG_LEVEL: "debug" | "info" | "warn" | "error";
    SUPABASE_URL?: string | undefined;
    SUPABASE_ANON_KEY?: string | undefined;
    SUPABASE_SERVICE_ROLE_KEY?: string | undefined;
    FEATURE_FLAGS?: string | undefined;
}, {
    NODE_ENV?: "development" | "test" | "staging" | "production" | undefined;
    SUPABASE_URL?: string | undefined;
    SUPABASE_ANON_KEY?: string | undefined;
    SUPABASE_SERVICE_ROLE_KEY?: string | undefined;
    LOG_LEVEL?: "debug" | "info" | "warn" | "error" | undefined;
    FEATURE_FLAGS?: string | undefined;
}>;
export type Env = z.infer<typeof EnvSchema>;
export declare function loadEnv(): Env;
export declare function parseFeatureFlags(raw?: string): Record<string, boolean>;
export {};
