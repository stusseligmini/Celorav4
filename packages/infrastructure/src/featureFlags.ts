import { loadEnv, parseFeatureFlags } from './env';

const flags = parseFeatureFlags(loadEnv().FEATURE_FLAGS);

export function isEnabled(flag: string, defaultValue = false): boolean {
  if (flag in flags) return flags[flag];
  return defaultValue;
}

export function listFlags() {
  return { ...flags };
}
