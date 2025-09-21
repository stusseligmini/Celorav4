"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const neuralEngine_1 = require("../neuralEngine");
(0, vitest_1.describe)('QuantumNeuralEngine', () => {
    (0, vitest_1.it)('produces fraud prediction with bounded scores', async () => {
        const engine = new neuralEngine_1.QuantumNeuralEngine();
        const pred = await engine.analyzeFraud({
            amount: 123,
            timestamp: Date.now() - 1000,
            source: 'addr-source',
            destination: 'addr-dest',
            blockConfidence: 0.9
        });
        (0, vitest_1.expect)(pred.riskScore).toBeGreaterThanOrEqual(0);
        (0, vitest_1.expect)(pred.riskScore).toBeLessThanOrEqual(1);
    });
});
