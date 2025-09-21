import express, { Request, Response } from 'express';
import { MarketDataService } from '../services/marketData';
import { ValidationError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/errorHandler';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();
const marketDataService = new MarketDataService();

// Get all market data
router.get('/', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const { limit = '100', offset = '0', symbols } = req.query;
  
  const limitNum = parseInt(limit as string);
  const offsetNum = parseInt(offset as string);
  
  if (limitNum > 100) {
    throw new ValidationError('Limit cannot exceed 100');
  }
  
  let symbolsArray: string[] | undefined;
  if (symbols) {
    symbolsArray = (symbols as string).split(',').map(s => s.trim().toUpperCase());
  }
  
  const marketData = await marketDataService.getMarketData(symbolsArray);
  
  // Apply pagination
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

// Get specific symbol data
router.get('/:symbol', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  
  if (!symbol) {
    throw new ValidationError('Symbol is required');
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

// Get price history for a symbol
router.get('/:symbol/history', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const { period = '24h', interval = '1h' } = req.query;
  
  if (!symbol) {
    throw new ValidationError('Symbol is required');
  }
  
  const symbolData = await marketDataService.getSymbolData(symbol.toUpperCase());
  
  if (!symbolData) {
    res.status(404).json({
      error: 'Symbol not found',
      message: `Market data for ${symbol.toUpperCase()} not found`
    });
    return;
  }
  
  // Return price history from the stored data
  res.json({
    symbol: symbol.toUpperCase(),
    period,
    interval,
    data: symbolData.priceHistory || []
  });
}));

// Get market summary
router.get('/summary/overview', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const marketData = await marketDataService.getMarketData();
  
  // Calculate market summary
  const totalMarketCap = marketData.reduce((sum, item) => sum + parseFloat(item.marketCap.toString()), 0);
  const totalVolume24h = marketData.reduce((sum, item) => sum + parseFloat(item.volume24h.toString()), 0);
  const gainersCount = marketData.filter(item => item.change24h > 0).length;
  const losersCount = marketData.filter(item => item.change24h < 0).length;
  
  const topGainer = marketData.reduce((max, item) => 
    item.change24h > max.change24h ? item : max, marketData[0]);
  
  const topLoser = marketData.reduce((min, item) => 
    item.change24h < min.change24h ? item : min, marketData[0]);
  
  res.json({
    summary: {
      totalMarketCap,
      totalVolume24h,
      totalCoins: marketData.length,
      gainersCount,
      losersCount,
      dominance: {
        btc: marketData.find(item => item.symbol === 'BTC')?.marketCap 
          ? (parseFloat(marketData.find(item => item.symbol === 'BTC')!.marketCap.toString()) / totalMarketCap * 100).toFixed(2)
          : '0',
        eth: marketData.find(item => item.symbol === 'ETH')?.marketCap 
          ? (parseFloat(marketData.find(item => item.symbol === 'ETH')!.marketCap.toString()) / totalMarketCap * 100).toFixed(2)
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

// Search symbols
router.get('/search/:query', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const { query } = req.params;
  
  if (!query || query.length < 2) {
    throw new ValidationError('Search query must be at least 2 characters long');
  }
  
  const marketData = await marketDataService.getMarketData();
  
  const results = marketData.filter(item => 
    item.symbol.toLowerCase().includes(query.toLowerCase()) ||
    item.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 20); // Limit to 20 results
  
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

// Get trending symbols (mock data)
router.get('/trending/symbols', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const marketData = await marketDataService.getMarketData();
  
  // Sort by volume and take top 10 as "trending"
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

// Get gainers and losers
router.get('/movers/all', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const { limit = '10' } = req.query;
  const limitNum = parseInt(limit as string);
  
  if (limitNum > 50) {
    throw new ValidationError('Limit cannot exceed 50');
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

export default router;
