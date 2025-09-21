#!/usr/bin/env node
import { QuantumNeuralEngine } from '@celora/quantum';

async function main(){
  const engine = new QuantumNeuralEngine();
  const prediction = await engine.analyzeFraud({
    amount: 42,
    timestamp: Date.now()-5000,
    source: 'source-address-123',
    destination: 'dest-address-456',
    blockConfidence: 0.95
  });
  console.log('[verify-neural] riskScore=', prediction.riskScore.toFixed(3), 'action=', prediction.recommendedAction);
}
main().catch(e=>{console.error(e);process.exit(1);});
