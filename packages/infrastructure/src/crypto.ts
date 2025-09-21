// Simple symmetric encryption helper using Web Crypto API (AES-GCM)
// NOTE: In production, keys should be derived per-user and stored securely (e.g., KMS)

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
  tag?: string; // placeholder if switching modes
  version: number;
}

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

async function getKey(rawKey: string): Promise<CryptoKey> {
  // Derive key bytes from raw key string (hash)
  const enc = TEXT_ENCODER.encode(rawKey);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptString(plain: string, keyMaterial: string): Promise<EncryptedPayload> {
  const key = await getKey(keyMaterial);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = TEXT_ENCODER.encode(plain);
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    ciphertext: Buffer.from(new Uint8Array(cipherBuf)).toString('base64'),
    iv: Buffer.from(iv).toString('base64'),
    version: 1
  };
}

export async function decryptString(payload: EncryptedPayload, keyMaterial: string): Promise<string> {
  const key = await getKey(keyMaterial);
  const iv = Uint8Array.from(Buffer.from(payload.iv, 'base64'));
  const cipherBytes = Uint8Array.from(Buffer.from(payload.ciphertext, 'base64'));
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBytes);
  return TEXT_DECODER.decode(plainBuf);
}
