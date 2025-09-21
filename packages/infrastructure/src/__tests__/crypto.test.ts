import { describe, it, expect } from 'vitest';
import { encryptString, decryptString } from '../crypto';

describe('crypto encryption', () => {
  it('round trips a string', async () => {
    const plain = 'test-secret-data';
    const key = 'user-key-material';
    const enc = await encryptString(plain, key);
    const dec = await decryptString(enc, key);
    expect(dec).toBe(plain);
  });
});
