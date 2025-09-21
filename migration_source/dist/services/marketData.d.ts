export declare class MarketDataService {
    private interval;
    private readonly UPDATE_INTERVAL;
    constructor();
    start(): void;
    stop(): void;
    private updateMarketData;
    private getBasePrice;
    private getSymbolName;
    private generatePriceHistory;
    getMarketData(symbols?: string[]): Promise<any[]>;
    getSymbolData(symbol: string): Promise<any | null>;
}
//# sourceMappingURL=marketData.d.ts.map