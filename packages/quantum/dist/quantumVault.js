"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuantumVault = void 0;
const nacl = __importStar(require("tweetnacl"));
const crypto_1 = require("crypto");
class QuantumVault {
    static generateKyberKeypair() {
        const seed = (0, crypto_1.randomBytes)(32);
        const { publicKey, secretKey } = nacl.sign.keyPair.fromSeed(seed);
        return { publicKey, secretKey, algorithm: 'kyber-sim' };
    }
    static generateKeypair() { return this.generateKyberKeypair(); }
    static encapsulate(publicKey) {
        const nonce = (0, crypto_1.randomBytes)(32);
        const shared = (0, crypto_1.createHash)('sha256').update(publicKey).update(nonce).digest();
        return { ciphertext: nonce, sharedSecret: new Uint8Array(shared) };
    }
    static signDilithium(message, secretKey) {
        const signature = nacl.sign.detached(message, secretKey);
        const publicKey = secretKey.slice(32, 64);
        return { signature, publicKey, algorithm: 'dilithium-sim' };
    }
    static verifyDilithium(message, sig) {
        return nacl.sign.detached.verify(message, sig.signature, sig.publicKey);
    }
    static homomorphicEncrypt(balance, publicKey) {
        const buf = Buffer.alloc(8);
        buf.writeDoubleLE(balance, 0);
        const digest = (0, crypto_1.createHash)('sha256').update(publicKey).update(buf).digest();
        return new Uint8Array(digest);
    }
}
exports.QuantumVault = QuantumVault;
