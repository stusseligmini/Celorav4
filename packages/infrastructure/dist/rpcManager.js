"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResilientRPCManager = void 0;
const web3_js_1 = require("@solana/web3.js");
const ethers_1 = require("ethers");
const env_1 = require("./env");
const logger_1 = require("./logger");
const HEALTH_INTERVAL = 15000; // 15s
const FAILURE_THRESHOLD = 3;
const MAX_FAILURE_PENALTY = 60_000; // 1 min penalty
class ResilientRPCManager {
    solanaEndpoints = [];
    ethEndpoints = [];
    solanaConn;
    ethProvider;
    healthTimer;
    constructor() {
        const env = (0, env_1.loadEnv)();
        this.solanaEndpoints = this.buildEndpointList(env.SOLANA_RPC_PRIMARY, env.SOLANA_RPC_FALLBACKS, 'solana');
        this.ethEndpoints = this.buildEndpointList(env.ETH_RPC_PRIMARY, env.ETH_RPC_FALLBACKS, 'ethereum');
    }
    buildEndpointList(primary, fallbacks, chain) {
        const urls = [primary, ...(fallbacks ? fallbacks.split(',') : [])].map(u => u.trim()).filter(Boolean);
        return urls.map(u => ({ url: u, chain, latencyMs: 0, consecutiveFailures: 0, lastSuccess: 0 }));
    }
    async init() {
        await Promise.all([this.pickSolanaConnection(), this.pickEthProvider()]);
        this.startHealthLoop();
    }
    chooseHealthy(endpoints) {
        const now = Date.now();
        const scored = endpoints.map(e => {
            const penalty = e.consecutiveFailures > 0 ? Math.min(MAX_FAILURE_PENALTY, e.consecutiveFailures * 5000) : 0;
            const staleness = now - e.lastSuccess > 5 * 60_000 ? 5000 : 0; // penalize if no success in 5m
            const score = e.latencyMs + penalty + staleness;
            return { e, score };
        }).sort((a, b) => a.score - b.score);
        return scored[0]?.e;
    }
    async pickSolanaConnection() {
        const ep = this.chooseHealthy(this.solanaEndpoints) || this.solanaEndpoints[0];
        this.solanaConn = new web3_js_1.Connection(ep.url, 'confirmed');
        logger_1.logger.info({ url: ep.url }, 'Solana RPC selected');
    }
    async pickEthProvider() {
        const ep = this.chooseHealthy(this.ethEndpoints) || this.ethEndpoints[0];
        this.ethProvider = new ethers_1.ethers.JsonRpcProvider(ep.url);
        logger_1.logger.info({ url: ep.url }, 'Ethereum RPC selected');
    }
    startHealthLoop() {
        if (this.healthTimer)
            return;
        this.healthTimer = setInterval(() => this.runHealthCheck().catch(err => logger_1.logger.error({ err }, 'Health check failed loop error')), HEALTH_INTERVAL);
    }
    async runHealthCheck() {
        const checks = [
            ...this.solanaEndpoints.map(e => this.probeSolana(e)),
            ...this.ethEndpoints.map(e => this.probeEth(e))
        ];
        const results = await Promise.all(checks);
        // Re-select connections if current chosen endpoints are degraded
        const currentSolana = this.solanaConn?.rpcEndpoint;
        const currentEth = this.ethProvider?._getConnection().url;
        const worst = (e) => e.consecutiveFailures >= FAILURE_THRESHOLD;
        if (currentSolana) {
            const currentHealth = this.solanaEndpoints.find(e => e.url === currentSolana);
            if (currentHealth && worst(currentHealth)) {
                logger_1.logger.warn({ currentSolana }, 'Rotating Solana RPC due to failures');
                await this.pickSolanaConnection();
            }
        }
        if (currentEth) {
            const currentHealth = this.ethEndpoints.find(e => e.url === currentEth);
            if (currentHealth && worst(currentHealth)) {
                logger_1.logger.warn({ currentEth }, 'Rotating Ethereum RPC due to failures');
                await this.pickEthProvider();
            }
        }
        return { timestamp: Date.now(), endpoints: [...this.solanaEndpoints, ...this.ethEndpoints] };
    }
    async probeSolana(e) {
        const start = performance.now();
        try {
            const conn = new web3_js_1.Connection(e.url, 'processed');
            await conn.getEpochInfo();
            e.latencyMs = performance.now() - start;
            e.consecutiveFailures = 0;
            e.lastSuccess = Date.now();
        }
        catch (err) {
            e.consecutiveFailures += 1;
            e.lastError = err.message;
            e.latencyMs = 9999;
        }
    }
    async probeEth(e) {
        const start = performance.now();
        try {
            const provider = new ethers_1.ethers.JsonRpcProvider(e.url);
            await provider.getBlockNumber();
            e.latencyMs = performance.now() - start;
            e.consecutiveFailures = 0;
            e.lastSuccess = Date.now();
        }
        catch (err) {
            e.consecutiveFailures += 1;
            e.lastError = err.message;
            e.latencyMs = 9999;
        }
    }
    // Public API
    async getSolanaBalance(pubkey) {
        if (!this.solanaConn)
            throw new Error('SOLANA_NOT_INITIALIZED');
        const lamports = await this.solanaConn.getBalance(new (await import('@solana/web3.js')).PublicKey(pubkey));
        return lamports / web3_js_1.LAMPORTS_PER_SOL;
    }
    async getEthBalance(address) {
        if (!this.ethProvider)
            throw new Error('ETH_NOT_INITIALIZED');
        const bal = await this.ethProvider.getBalance(address);
        return Number(ethers_1.ethers.formatEther(bal));
    }
}
exports.ResilientRPCManager = ResilientRPCManager;
