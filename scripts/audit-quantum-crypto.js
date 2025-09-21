#!/usr/bin/env node
import { QuantumVault } from '@celora/quantum';

function main() {
  console.log('[audit-quantum-crypto] Starting basic audit (simulation)');
  const kp = QuantumVault.generateKyberKeypair();
  const shared = QuantumVault.encapsulate(kp.publicKey);
  if (!shared.sharedSecret || shared.sharedSecret.length === 0) {
    console.error('Shared secret generation failed');
    process.exit(1);
  }
  const msg = new TextEncoder().encode('audit');
  const sig = QuantumVault.signDilithium(msg, kp.secretKey);
  const ok = QuantumVault.verifyDilithium(msg, sig);
  console.log('Signature verify:', ok);
  console.log('[audit-quantum-crypto] Completed (stub)');
}

main();
