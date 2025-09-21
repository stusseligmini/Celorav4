#!/usr/bin/env node
import { QuantumNeuralEngine } from '@celora/quantum';

async function run(){
  const engine = new QuantumNeuralEngine();
  const iterations = 100;
  const start = Date.now();
  for (let i=0;i<iterations;i++) {
    await engine.analyzeFraud({
      amount: Math.random()*1000,
      timestamp: Date.now()-Math.floor(Math.random()*1e6),
      source: 'src-'+Math.random().toString(36).slice(2),
      destination: 'dst-'+Math.random().toString(36).slice(2),
      blockConfidence: 0.9
    });
  }
  const ms = Date.now()-start;
  console.log(`[benchmark:neural] ${iterations} fraud analyses in ${ms}ms => ${(ms/iterations).toFixed(2)} ms/op`);
}
run();
