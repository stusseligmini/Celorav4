interface QuantumKeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
    algorithm: 'kyber-sim';
}
interface QuantumSignature {
    signature: Uint8Array;
    publicKey: Uint8Array;
    algorithm: 'dilithium-sim';
}
declare class QuantumVault {
    static generateKyberKeypair(): QuantumKeyPair;
    static generateKeypair(): QuantumKeyPair;
    static encapsulate(publicKey: Uint8Array): {
        ciphertext: Uint8Array;
        sharedSecret: Uint8Array;
    };
    static signDilithium(message: Uint8Array, secretKey: Uint8Array): QuantumSignature;
    static verifyDilithium(message: Uint8Array, sig: QuantumSignature): boolean;
    static homomorphicEncrypt(balance: number, publicKey: Uint8Array): Uint8Array;
}
export { QuantumVault, type QuantumKeyPair, type QuantumSignature };
