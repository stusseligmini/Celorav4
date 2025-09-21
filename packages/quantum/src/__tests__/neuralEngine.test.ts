import { describe, it, expect } from 'vitest';
import { QuantumNeuralEngine } from '../neuralEngine';

describe('QuantumNeuralEngine', () => {
  it('produces fraud prediction with bounded scores', async () => {
    const engine = new QuantumNeuralEngine();
    const pred = await engine.analyzeFraud({
      amount: 123,
      timestamp: Date.now() - 1000,
      source: 'addr-source',
      destination: 'addr-dest',
      blockConfidence: 0.9
    });
    expect(pred.riskScore).toBeGreaterThanOrEqual(0);
    expect(pred.riskScore).toBeLessThanOrEqual(1);
  });
});
