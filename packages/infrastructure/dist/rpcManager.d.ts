export declare class ResilientRPCManager {
    private solanaEndpoints;
    private ethEndpoints;
    private solanaConn?;
    private ethProvider?;
    private healthTimer?;
    constructor();
    private buildEndpointList;
    init(): Promise<void>;
    private chooseHealthy;
    private pickSolanaConnection;
    private pickEthProvider;
    private startHealthLoop;
    private runHealthCheck;
    private probeSolana;
    private probeEth;
    getSolanaBalance(pubkey: string): Promise<number>;
    getEthBalance(address: string): Promise<number>;
}
