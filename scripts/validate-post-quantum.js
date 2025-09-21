#!/usr/bin/env node
import { QuantumVault } from '@celora/quantum';

function main() {
  const pair = QuantumVault.generateKyberKeypair();
  const msg = new TextEncoder().encode('celora-validation');
  const sig = QuantumVault.signDilithium(msg, pair.secretKey);
  const ok = QuantumVault.verifyDilithium(msg, sig);
  if (!ok) {
    console.error('Post-quantum signature simulation FAILED');
    process.exit(1);
  }
  console.log('Post-quantum signature simulation OK');
}

main();
