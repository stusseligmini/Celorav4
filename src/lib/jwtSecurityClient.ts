/**
 * JWT helpers safe for client/browser usage
 */

// Minimal payload type used by helpers
export interface JwtPayload {
  exp: number;
  iat: number;
  aud: string | string[];
  sub: string;
  email?: string;
  role?: string;
  jti?: string;
  fingerprint?: string;
  [key: string]: any;
}

/**
 * Validates a JWT token's expiration and basic structure.
 * NOTE: This does NOT verify signatures client-side.
 */
export function validateJwt(token: string): { valid: boolean; payload?: JwtPayload; error?: string } {
  try {
    const payload = decodeJwt<JwtPayload>(token);

    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp) return { valid: false, error: 'Token has no expiration claim' };
    if (payload.exp < now) return { valid: false, error: 'Token has expired' };
    if (payload.iat && payload.iat > now + 60) return { valid: false, error: 'Token was issued in the future' };
    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Invalid token format' };
  }
}

/** Simple JWT decode without verification (client-safe) */
function decodeJwt<T = any>(token: string): T {
  const parts = token.split('.');
  if (parts.length < 2) throw new Error('Invalid JWT');
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('utf8');
  return JSON.parse(json) as T;
}

/**
 * Creates a refresh strategy decision based on token expiry proximity.
 */
export function createRefreshStrategy(token: string): {
  shouldRefresh: boolean;
  refreshThreshold: number;
  reason?: string;
} {
  const { valid, payload, error } = validateJwt(token);
  if (!valid || !payload) return { shouldRefresh: true, refreshThreshold: 0, reason: error || 'Invalid token' };

  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = payload.exp - now;
  if (timeUntilExpiry < 300) return { shouldRefresh: true, refreshThreshold: 300, reason: 'Token expiring soon' };
  return { shouldRefresh: false, refreshThreshold: 300 };
}

/**
 * Lightweight misuse detection using audience and fingerprint hints.
 */
export function detectTokenMisuse(
  token: string,
  context: { userFingerprint?: string; ip?: string; userAgent?: string }
): { detected: boolean; reason?: string; severity: 'low' | 'medium' | 'high' } {
  const { payload } = validateJwt(token);
  if (!payload) return { detected: true, reason: 'Invalid token format', severity: 'medium' };

  const aud = payload.aud;
  if (typeof aud === 'string' && process.env.NEXT_PUBLIC_SUPABASE_URL && aud !== process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { detected: true, reason: 'Token audience mismatch', severity: 'high' };
  }

  if (payload.fingerprint && context.userFingerprint && payload.fingerprint !== context.userFingerprint) {
    return { detected: true, reason: 'Browser fingerprint mismatch', severity: 'high' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.iat && now - payload.iat > 60 * 60 * 24 * 30) {
    return { detected: true, reason: 'Token unusually old', severity: 'medium' };
  }

  return { detected: false, severity: 'low' };
}
