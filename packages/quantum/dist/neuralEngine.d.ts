interface TransactionFeatures {
    amount: number;
    timestamp: number;
    source: string;
    destination: string;
    gasPrice?: number;
    blockConfidence: number;
}
interface FraudPrediction {
    riskScore: number;
    confidence: number;
    reasons: string[];
    recommendedAction: 'allow' | 'review' | 'block';
}
declare class QuantumNeuralEngine {
    private networks;
    private evolutionHistory;
    constructor();
    /**
     * Analyze transaction for fraud using quantum-enhanced ML
     */
    analyzeFraud(tx: TransactionFeatures): Promise<FraudPrediction>;
    /**
     * Evolve neural networks using genetic algorithm
     */
    evolveNetworks(performanceMetrics: Record<string, number>): Promise<void>;
    /**
     * Predict optimal scaling based on blockchain congestion
     */
    predictScaling(networkMetrics: {
        solanaLatency: number;
        ethGasPrice: number;
        transactionVolume: number;
        blockFullness: number;
    }): {
        recommendedInstances: number;
        rpePriority: 'solana' | 'ethereum' | 'balanced';
        cacheStrategy: 'aggressive' | 'conservative' | 'adaptive';
    };
    private initializeNetworks;
    private createLayer;
    private extractFeatures;
    private forwardLayer;
    private activate;
    private predict;
    private calculateConfidence;
    private quantumVerifyTransaction;
    private generateReasons;
    private determineAction;
    private shouldEvolve;
    private geneticEvolution;
    private mutateNetwork;
    private calculateAddressEntropy;
    private quantumRandom;
}
export { QuantumNeuralEngine, type TransactionFeatures, type FraudPrediction };
