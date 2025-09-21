const express = require('express');
const { body, param, query } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const matchingEngine = require('../services/matchingEngine');
const solanaClient = require('../services/solanaClient');
const { authenticateToken } = require('../middleware/auth');
const { handleValidation } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const router = express.Router();

// Test endpoint without authentication for debugging
router.get('/test', (req, res) => {
  res.json({
    message: 'Trading API is working',
    timestamp: new Date().toISOString(),
    status: 'OK'
  });
});

// Get all available trading pairs
router.get('/markets', (req, res) => {
  try {
    logger.info('Getting markets data...');
    logger.info('MatchingEngine type:', typeof matchingEngine);
    logger.info('MatchingEngine methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(matchingEngine)));
    
    const markets = matchingEngine.getMarketSummary();
    const stats = matchingEngine.getStats();
    
    res.json({
      markets,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get markets:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to get market data',
      code: 'MARKET_DATA_ERROR',
      details: error.message
    });
  }
});

// Enhanced order placement with comprehensive validation
router.post('/order', authenticateToken, [
  body('pair').notEmpty().matches(/^[A-Z0-9]+\/[A-Z0-9]+$/),
  body('side').isIn(['BUY', 'SELL']),
  body('type').isIn(['LIMIT', 'MARKET']),
  body('amount').isFloat({ gt: 0, lt: 1000000 }),
  body('price').optional().isFloat({ gt: 0 }),
  body('timeInForce').optional().isIn(['GTC', 'IOC', 'FOK'])
], handleValidation, async (req, res) => {
  try {
    const { pair, side, type, amount, price, timeInForce } = req.body;
    
    // Enhanced order validation
    if (type === 'LIMIT' && !price) {
      return res.status(400).json({ error: 'Limit orders require a price' });
    }
    
    // Check user's balance (mock implementation)
    const userBalance = await mockCheckUserBalance(req.user.id, pair, side, amount, price);
    if (!userBalance.sufficient) {
      return res.status(400).json({ 
        error: 'Insufficient balance',
        required: userBalance.required,
        available: userBalance.available
      });
    }
    
    const order = {
      id: uuidv4(),
      userId: req.user.id,
      pair,
      side,
      type,
      price: price ? parseFloat(price) : undefined,
      amount: parseFloat(amount),
      timeInForce: timeInForce || 'GTC',
      source: 'api',
      metadata: {
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        timestamp: new Date().toISOString()
      }
    };

    // Execute order through matching engine
    const result = await matchingEngine.placeOrder(order);
    
    // Log for compliance and monitoring
    logger.info(`📈 Order executed: ${side} ${amount} ${pair} @ ${price || 'MARKET'}`, {
      orderId: order.id,
      userId: req.user.id,
      pair,
      side,
      type,
      amount,
      price,
      filled: result.totalFilled,
      avgPrice: result.avgFillPrice,
      trades: result.trades.length,
      status: result.order.status
    });
    
    res.status(201).json({
      message: 'Order placed successfully',
      order: {
        id: result.order.id,
        pair: result.order.pair,
        side: result.order.side,
        type: result.order.type,
        amount: result.order.amount,
        price: result.order.price,
        filled: result.order.filled,
        remaining: result.order.remaining,
        status: result.order.status,
        createdAt: result.order.createdAt
      },
      execution: {
        totalFilled: result.totalFilled,
        avgFillPrice: result.avgFillPrice,
        trades: result.trades.length,
        totalValue: result.trades.reduce((sum, trade) => sum + trade.value, 0)
      },
      trades: result.trades.map(trade => ({
        id: trade.id,
        price: trade.price,
        amount: trade.amount,
        timestamp: trade.timestamp,
        side: trade.side
      }))
    });
    
  } catch (error) {
    logger.error('❌ Order placement error:', error);
    res.status(500).json({ 
      error: 'Order placement failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get enhanced orderbook with market data
router.get('/orderbook/:pair', [
  param('pair').matches(/^[A-Z0-9]+\/[A-Z0-9]+$/),
  query('depth').optional().isInt({ min: 1, max: 100 })
], handleValidation, async (req, res) => {
  try {
    const { pair } = req.params;
    const depth = parseInt(req.query.depth) || 20;
    
    const orderbook = await matchingEngine.getOrderbook(pair, depth);
    
    // Add real-time network info for timing-sensitive trading
    const networkInfo = await solanaClient.getNetworkInfo();
    
    res.json({
      ...orderbook,
      network: {
        slot: networkInfo.slot,
        blockTime: networkInfo.blockTime,
        epoch: networkInfo.epoch
      },
      meta: {
        requestTime: new Date().toISOString(),
        depth: depth
      }
    });
    
  } catch (error) {
    logger.error('❌ Orderbook retrieval error:', error);
    res.status(500).json({ error: 'Failed to fetch orderbook' });
  }
});

// Get user's open orders
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const userOrders = await matchingEngine.getUserOrders(req.user.id);
    
    res.json({
      orders: userOrders,
      totalOrders: userOrders.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('❌ User orders retrieval error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Cancel an order
router.delete('/orders/:orderId', authenticateToken, [
  param('orderId').isUUID()
], handleValidation, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const cancelledOrder = await matchingEngine.cancelOrder(orderId, req.user.id);
    
    logger.info(`🚫 Order cancelled: ${orderId}`, {
      orderId,
      userId: req.user.id,
      pair: cancelledOrder.pair,
      side: cancelledOrder.side,
      amount: cancelledOrder.amount,
      filled: cancelledOrder.filled
    });
    
    res.json({
      message: 'Order cancelled successfully',
      order: {
        id: cancelledOrder.id,
        pair: cancelledOrder.pair,
        side: cancelledOrder.side,
        amount: cancelledOrder.amount,
        filled: cancelledOrder.filled,
        remaining: cancelledOrder.remaining,
        status: cancelledOrder.status,
        cancelledAt: cancelledOrder.cancelledAt
      }
    });
    
  } catch (error) {
    logger.error('❌ Order cancellation error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get trade history for a pair or user
router.get('/trades', authenticateToken, [
  query('pair').optional().matches(/^[A-Z0-9]+\/[A-Z0-9]+$/),
  query('limit').optional().isInt({ min: 1, max: 100 })
], handleValidation, async (req, res) => {
  try {
    const { pair } = req.query;
    const limit = parseInt(req.query.limit) || 50;
    
    const trades = await matchingEngine.getTradeHistory(pair, limit);
    
    // Filter trades for user's orders only (privacy)
    const userTrades = trades.filter(trade => 
      trade.takerUserId === req.user.id || trade.makerUserId === req.user.id
    );
    
    res.json({
      trades: userTrades.map(trade => ({
        id: trade.id,
        pair: trade.pair,
        price: trade.price,
        amount: trade.amount,
        value: trade.value,
        side: trade.side,
        timestamp: trade.timestamp,
        role: trade.takerUserId === req.user.id ? 'taker' : 'maker'
      })),
      totalTrades: userTrades.length,
      pair: pair || 'all',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('❌ Trade history retrieval error:', error);
    res.status(500).json({ error: 'Failed to fetch trade history' });
  }
});

// Get market summary for all supported pairs
router.get('/markets', async (req, res) => {
  try {
    const marketSummary = await matchingEngine.getMarketSummary();
    
    res.json({
      markets: marketSummary,
      totalPairs: Object.keys(marketSummary).length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('❌ Market summary error:', error);
    res.status(500).json({ error: 'Failed to fetch market summary' });
  }
});

// Get trading engine statistics (admin/monitoring)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Basic rate limiting for stats endpoint
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const engineStats = await matchingEngine.getStats();
    const solanaHealth = await solanaClient.healthCheck();
    
    res.json({
      engine: engineStats,
      solana: solanaHealth,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('❌ Stats retrieval error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

/**
 * Mock function to check user balance
 * PRODUCTION: Replace with real balance check from database/blockchain
 */
async function mockCheckUserBalance(userId, pair, side, amount, price) {
  // Mock implementation - always return sufficient balance for development
  const [baseAsset, quoteAsset] = pair.split('/');
  
  if (side === 'BUY') {
    const requiredQuote = price ? amount * price : amount * 100; // Estimate for market orders
    return {
      sufficient: true,
      required: requiredQuote,
      available: requiredQuote * 2, // Mock: always have 2x required
      asset: quoteAsset
    };
  } else {
    return {
      sufficient: true,
      required: amount,
      available: amount * 2, // Mock: always have 2x required
      asset: baseAsset
    };
  }
}

module.exports = router;
