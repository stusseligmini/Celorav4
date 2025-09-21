#!/usr/bin/env node
import { QuantumVault } from '@celora/quantum';
console.log('[verify-quantum] Verifying quantum vault primitives');
const kp = QuantumVault.generateKyberKeypair();
const msg = new TextEncoder().encode('verify');
const sig = QuantumVault.signDilithium(msg, kp.secretKey);
if (!QuantumVault.verifyDilithium(msg, sig)) {
  console.error('Quantum verification failed');
  process.exit(1);
}
console.log('Quantum verify success');
