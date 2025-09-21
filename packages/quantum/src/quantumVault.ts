import * as nacl from 'tweetnacl';
import { randomBytes, createHash } from 'crypto';

interface QuantumKeyPair { publicKey: Uint8Array; secretKey: Uint8Array; algorithm: 'kyber-sim'; }
interface QuantumSignature { signature: Uint8Array; publicKey: Uint8Array; algorithm: 'dilithium-sim'; }

class QuantumVault {
  static generateKyberKeypair(): QuantumKeyPair {
    const seed = randomBytes(32);
    const { publicKey, secretKey } = nacl.sign.keyPair.fromSeed(seed);
    return { publicKey, secretKey, algorithm: 'kyber-sim' };
  }
  static generateKeypair() { return this.generateKyberKeypair(); }

  static encapsulate(publicKey: Uint8Array): { ciphertext: Uint8Array; sharedSecret: Uint8Array } {
    const nonce = randomBytes(32);
    const shared = createHash('sha256').update(publicKey).update(nonce).digest();
    return { ciphertext: nonce, sharedSecret: new Uint8Array(shared) };
  }

  static signDilithium(message: Uint8Array, secretKey: Uint8Array): QuantumSignature {
    const signature = nacl.sign.detached(message, secretKey);
    const publicKey = secretKey.slice(32, 64);
    return { signature, publicKey, algorithm: 'dilithium-sim' };
  }

  static verifyDilithium(message: Uint8Array, sig: QuantumSignature): boolean {
    return nacl.sign.detached.verify(message, sig.signature, sig.publicKey);
  }

  static homomorphicEncrypt(balance: number, publicKey: Uint8Array): Uint8Array {
    const buf = Buffer.alloc(8);
    buf.writeDoubleLE(balance, 0);
    const digest = createHash('sha256').update(publicKey).update(buf).digest();
    return new Uint8Array(digest);
  }
}

export { QuantumVault, type QuantumKeyPair, type QuantumSignature };