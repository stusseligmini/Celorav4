"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketDataService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class MarketDataService {
    constructor() {
        this.interval = null;
        this.UPDATE_INTERVAL = 30 * 1000;
    }
    start() {
        console.log('Starting market data service...');
        this.updateMarketData();
        this.interval = setInterval(() => {
            this.updateMarketData();
        }, this.UPDATE_INTERVAL);
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log('Market data service stopped');
        }
    }
    async updateMarketData() {
        try {
            const symbols = ['BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'ADA', 'DOT', 'MATIC', 'AVAX', 'LINK'];
            const marketDataUpdates = symbols.map((symbol, index) => {
                const basePrice = this.getBasePrice(symbol);
                const change = (Math.random() - 0.5) * 0.1;
                const price = basePrice * (1 + change);
                return {
                    symbol,
                    name: this.getSymbolName(symbol),
                    price: Math.round(price * 100) / 100,
                    change24h: change * 100,
                    volume24h: Math.random() * 1000000000,
                    marketCap: price * Math.random() * 1000000000,
                    rank: index + 1,
                    priceHistory: this.generatePriceHistory(basePrice)
                };
            });
            for (const data of marketDataUpdates) {
                await prisma.marketData.upsert({
                    where: { symbol: data.symbol },
                    update: {
                        price: data.price,
                        change24h: data.change24h,
                        volume24h: data.volume24h,
                        marketCap: data.marketCap,
                        priceHistory: data.priceHistory
                    },
                    create: data
                });
            }
            console.log(`Updated market data for ${symbols.length} symbols`);
        }
        catch (error) {
            console.error('Error updating market data:', error);
        }
    }
    getBasePrice(symbol) {
        const basePrices = {
            'BTC': 43000,
            'ETH': 2600,
            'SOL': 100,
            'USDC': 1,
            'USDT': 1,
            'ADA': 0.5,
            'DOT': 7,
            'MATIC': 0.8,
            'AVAX': 40,
            'LINK': 15
        };
        return basePrices[symbol] || 1;
    }
    getSymbolName(symbol) {
        const names = {
            'BTC': 'Bitcoin',
            'ETH': 'Ethereum',
            'SOL': 'Solana',
            'USDC': 'USD Coin',
            'USDT': 'Tether',
            'ADA': 'Cardano',
            'DOT': 'Polkadot',
            'MATIC': 'Polygon',
            'AVAX': 'Avalanche',
            'LINK': 'Chainlink'
        };
        return names[symbol] || symbol;
    }
    generatePriceHistory(basePrice) {
        const history = [];
        const now = new Date();
        for (let i = 23; i >= 0; i--) {
            const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
            const change = (Math.random() - 0.5) * 0.05;
            const price = basePrice * (1 + change);
            history.push({
                timestamp: timestamp.toISOString(),
                price: Math.round(price * 100) / 100
            });
        }
        return history;
    }
    async getMarketData(symbols) {
        const whereClause = symbols ? { symbol: { in: symbols } } : {};
        return await prisma.marketData.findMany({
            where: whereClause,
            orderBy: { rank: 'asc' }
        });
    }
    async getSymbolData(symbol) {
        return await prisma.marketData.findUnique({
            where: { symbol: symbol.toUpperCase() }
        });
    }
}
exports.MarketDataService = MarketDataService;
//# sourceMappingURL=marketData.js.map