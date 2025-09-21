"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const marketData_1 = require("../services/marketData");
const errorHandler_1 = require("../middleware/errorHandler");
const errorHandler_2 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const marketDataService = new marketData_1.MarketDataService();
router.get('/', auth_1.optionalAuth, (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { limit = '100', offset = '0', symbols } = req.query;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);
    if (limitNum > 100) {
        throw new errorHandler_1.ValidationError('Limit cannot exceed 100');
    }
    let symbolsArray;
    if (symbols) {
        symbolsArray = symbols.split(',').map(s => s.trim().toUpperCase());
    }
    const marketData = await marketDataService.getMarketData(symbolsArray);
    const paginatedData = marketData.slice(offsetNum, offsetNum + limitNum);
    res.json({
        data: paginatedData,
        meta: {
            total: marketData.length,
            limit: limitNum,
            offset: offsetNum,
            hasMore: offsetNum + limitNum < marketData.length
        }
    });
}));
router.get('/:symbol', auth_1.optionalAuth, (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { symbol } = req.params;
    if (!symbol) {
        throw new errorHandler_1.ValidationError('Symbol is required');
    }
    const symbolData = await marketDataService.getSymbolData(symbol.toUpperCase());
    if (!symbolData) {
        res.status(404).json({
            error: 'Symbol not found',
            message: `Market data for ${symbol.toUpperCase()} not found`
        });
        return;
    }
    res.json({
        data: symbolData
    });
}));
router.get('/:symbol/history', auth_1.optionalAuth, (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { symbol } = req.params;
    const { period = '24h', interval = '1h' } = req.query;
    if (!symbol) {
        throw new errorHandler_1.ValidationError('Symbol is required');
    }
    const symbolData = await marketDataService.getSymbolData(symbol.toUpperCase());
    if (!symbolData) {
        res.status(404).json({
            error: 'Symbol not found',
            message: `Market data for ${symbol.toUpperCase()} not found`
        });
        return;
    }
    res.json({
        symbol: symbol.toUpperCase(),
        period,
        interval,
        data: symbolData.priceHistory || []
    });
}));
router.get('/summary/overview', auth_1.optionalAuth, (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const marketData = await marketDataService.getMarketData();
    const totalMarketCap = marketData.reduce((sum, item) => sum + parseFloat(item.marketCap.toString()), 0);
    const totalVolume24h = marketData.reduce((sum, item) => sum + parseFloat(item.volume24h.toString()), 0);
    const gainersCount = marketData.filter(item => item.change24h > 0).length;
    const losersCount = marketData.filter(item => item.change24h < 0).length;
    const topGainer = marketData.reduce((max, item) => item.change24h > max.change24h ? item : max, marketData[0]);
    const topLoser = marketData.reduce((min, item) => item.change24h < min.change24h ? item : min, marketData[0]);
    res.json({
        summary: {
            totalMarketCap,
            totalVolume24h,
            totalCoins: marketData.length,
            gainersCount,
            losersCount,
            dominance: {
                btc: marketData.find(item => item.symbol === 'BTC')?.marketCap
                    ? (parseFloat(marketData.find(item => item.symbol === 'BTC').marketCap.toString()) / totalMarketCap * 100).toFixed(2)
                    : '0',
                eth: marketData.find(item => item.symbol === 'ETH')?.marketCap
                    ? (parseFloat(marketData.find(item => item.symbol === 'ETH').marketCap.toString()) / totalMarketCap * 100).toFixed(2)
                    : '0'
            }
        },
        topPerformers: {
            gainer: {
                symbol: topGainer?.symbol,
                name: topGainer?.name,
                price: topGainer?.price,
                change24h: topGainer?.change24h
            },
            loser: {
                symbol: topLoser?.symbol,
                name: topLoser?.name,
                price: topLoser?.price,
                change24h: topLoser?.change24h
            }
        },
        topByMarketCap: marketData.slice(0, 10).map(item => ({
            symbol: item.symbol,
            name: item.name,
            price: item.price,
            marketCap: item.marketCap,
            change24h: item.change24h
        }))
    });
}));
router.get('/search/:query', auth_1.optionalAuth, (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { query } = req.params;
    if (!query || query.length < 2) {
        throw new errorHandler_1.ValidationError('Search query must be at least 2 characters long');
    }
    const marketData = await marketDataService.getMarketData();
    const results = marketData.filter(item => item.symbol.toLowerCase().includes(query.toLowerCase()) ||
        item.name.toLowerCase().includes(query.toLowerCase())).slice(0, 20);
    res.json({
        query,
        results: results.map(item => ({
            symbol: item.symbol,
            name: item.name,
            price: item.price,
            change24h: item.change24h,
            marketCap: item.marketCap
        }))
    });
}));
router.get('/trending/symbols', auth_1.optionalAuth, (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const marketData = await marketDataService.getMarketData();
    const trending = marketData
        .sort((a, b) => parseFloat(b.volume24h.toString()) - parseFloat(a.volume24h.toString()))
        .slice(0, 10)
        .map(item => ({
        symbol: item.symbol,
        name: item.name,
        price: item.price,
        change24h: item.change24h,
        volume24h: item.volume24h,
        rank: item.rank
    }));
    res.json({
        trending
    });
}));
router.get('/movers/all', auth_1.optionalAuth, (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { limit = '10' } = req.query;
    const limitNum = parseInt(limit);
    if (limitNum > 50) {
        throw new errorHandler_1.ValidationError('Limit cannot exceed 50');
    }
    const marketData = await marketDataService.getMarketData();
    const gainers = marketData
        .filter(item => item.change24h > 0)
        .sort((a, b) => b.change24h - a.change24h)
        .slice(0, limitNum)
        .map(item => ({
        symbol: item.symbol,
        name: item.name,
        price: item.price,
        change24h: item.change24h,
        volume24h: item.volume24h
    }));
    const losers = marketData
        .filter(item => item.change24h < 0)
        .sort((a, b) => a.change24h - b.change24h)
        .slice(0, limitNum)
        .map(item => ({
        symbol: item.symbol,
        name: item.name,
        price: item.price,
        change24h: item.change24h,
        volume24h: item.volume24h
    }));
    res.json({
        gainers,
        losers
    });
}));
exports.default = router;
//# sourceMappingURL=market.js.map