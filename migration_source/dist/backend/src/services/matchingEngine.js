/**
 * Celora Production-Grade Matching Engine
 * Optimized for Solana trading with high-speed execution
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class MatchingEngine {
  constructor() {
    this.orderbooks = {};
    this.orders = new Map();
    this.tradeHistory = [];
    this.marketStats = {};
    
    // Initialize Solana pairs
    const solanaPairs = ['SOL/USDC', 'SOL/USDT', 'mSOL/SOL', 'RAY/SOL', 'ORCA/SOL'];
    solanaPairs.forEach(pair => {
      this.orderbooks[pair] = { bids: [], asks: [], lastPrice: null, volume24h: 0 };
      this.marketStats[pair] = { totalOrders: 0, totalTrades: 0, totalVolume: 0 };
    });
    
    logger.info('🔄 Matching Engine initialized with Solana markets');
  }

  _ensurePair(pair) {
    if (!this.orderbooks[pair]) {
      this.orderbooks[pair] = { bids: [], asks: [], lastPrice: null, volume24h: 0 };
      this.marketStats[pair] = { totalOrders: 0, totalTrades: 0, totalVolume: 0 };
    }
  }

  placeOrder(order) {
    try {
      if (!order.pair || !order.side || !order.type || !order.amount) {
        throw new Error('Missing required order fields');
      }
      
      this._ensurePair(order.pair);
      
      const enrichedOrder = {
        ...order,
        id: order.id || uuidv4(),
        remaining: order.remaining || order.amount,
        filled: 0,
        createdAt: new Date().toISOString(),
        status: 'PENDING'
      };
      
      this.orders.set(enrichedOrder.id, enrichedOrder);
      this.marketStats[order.pair].totalOrders++;
      
      const result = this._executeMatching(enrichedOrder);
      
      logger.info(`📊 Order processed: ${enrichedOrder.side} ${enrichedOrder.amount} ${enrichedOrder.pair}`);
      
      return result;
    } catch (error) {
      logger.error('❌ Order placement failed:', error);
      throw error;
    }
  }

  _executeMatching(order) {
    const book = this.orderbooks[order.pair];
    const trades = [];

    if (order.type === 'MARKET') {
      trades.push(...this._executeMarketOrder(order, book));
    } else if (order.type === 'LIMIT') {
      trades.push(...this._executeLimitOrder(order, book));
    }
    
    if (trades.length > 0) {
      this._updateMarketData(order.pair, trades);
      this.tradeHistory.push(...trades);
    }
    
    const totalFilled = trades.reduce((sum, trade) => sum + trade.amount, 0);
    const avgFillPrice = trades.length > 0 
      ? trades.reduce((sum, trade) => sum + (trade.price * trade.amount), 0) / totalFilled
      : null;
    
    return { order, trades, totalFilled, avgFillPrice };
  }

  _executeMarketOrder(order, book) {
    const trades = [];
    const oppositeBook = order.side === 'BUY' ? book.asks : book.bids;
    
    oppositeBook.sort((a, b) => 
      order.side === 'BUY' ? a.price - b.price : b.price - a.price
    );
    
    let i = 0;
    while (i < oppositeBook.length && order.remaining > 0) {
      const bookOrder = oppositeBook[i];
      const tradeAmount = Math.min(order.remaining, bookOrder.remaining);
      
      if (tradeAmount > 0) {
        const trade = this._createTrade(order, bookOrder, tradeAmount, bookOrder.price);
        trades.push(trade);
        
        order.remaining -= tradeAmount;
        order.filled += tradeAmount;
        bookOrder.remaining -= tradeAmount;
        
        if (bookOrder.remaining <= 0) {
          oppositeBook.splice(i, 1);
          this.orders.delete(bookOrder.id);
        } else {
          i++;
        }
      } else {
        i++;
      }
    }
    
    order.status = order.remaining <= 0 ? 'FILLED' : 'PARTIALLY_FILLED';
    return trades;
  }

  _executeLimitOrder(order, book) {
    const trades = [];
    const oppositeBook = order.side === 'BUY' ? book.asks : book.bids;
    
    oppositeBook.sort((a, b) => 
      order.side === 'BUY' ? a.price - b.price : b.price - a.price
    );
    
    let i = 0;
    while (i < oppositeBook.length && order.remaining > 0) {
      const bookOrder = oppositeBook[i];
      const priceMatch = order.side === 'BUY' 
        ? order.price >= bookOrder.price 
        : order.price <= bookOrder.price;
        
      if (!priceMatch) break;
      
      const tradeAmount = Math.min(order.remaining, bookOrder.remaining);
      const trade = this._createTrade(order, bookOrder, tradeAmount, bookOrder.price);
      trades.push(trade);
      
      order.remaining -= tradeAmount;
      order.filled += tradeAmount;
      bookOrder.remaining -= tradeAmount;
      
      if (bookOrder.remaining <= 0) {
        oppositeBook.splice(i, 1);
        this.orders.delete(bookOrder.id);
      } else {
        i++;
      }
    }
    
    // Place remainder in orderbook if not fully filled
    if (order.remaining > 0) {
      const targetBook = order.side === 'BUY' ? book.bids : book.asks;
      targetBook.push(order);
      book.bids.sort((a, b) => b.price - a.price);
      book.asks.sort((a, b) => a.price - b.price);
      order.status = order.filled > 0 ? 'PARTIALLY_FILLED' : 'OPEN';
    } else {
      order.status = 'FILLED';
    }
    
    return trades;
  }

  _createTrade(takerOrder, makerOrder, amount, price) {
    return {
      id: uuidv4(),
      pair: takerOrder.pair,
      price: parseFloat(price.toFixed(8)),
      amount: parseFloat(amount.toFixed(8)),
      timestamp: new Date().toISOString(),
      takerOrderId: takerOrder.id,
      makerOrderId: makerOrder.id,
      takerUserId: takerOrder.userId,
      makerUserId: makerOrder.userId,
      side: takerOrder.side,
      value: parseFloat((amount * price).toFixed(8))
    };
  }

  _updateMarketData(pair, trades) {
    const book = this.orderbooks[pair];
    const stats = this.marketStats[pair];
    
    if (trades.length > 0) {
      const lastTrade = trades[trades.length - 1];
      book.lastPrice = lastTrade.price;
      
      const volume = trades.reduce((sum, trade) => sum + trade.value, 0);
      book.volume24h += volume;
      stats.totalTrades += trades.length;
      stats.totalVolume += volume;
    }
  }

  getOrderbook(pair, depth = 20) {
    this._ensurePair(pair);
    const book = this.orderbooks[pair];
    
    return {
      pair,
      timestamp: new Date().toISOString(),
      bids: book.bids.slice(0, depth).map(o => ({
        price: o.price,
        amount: o.remaining,
        orders: 1
      })),
      asks: book.asks.slice(0, depth).map(o => ({
        price: o.price,
        amount: o.remaining,
        orders: 1
      })),
      lastPrice: book.lastPrice,
      volume24h: book.volume24h
    };
  }

  getUserOrders(userId) {
    const userOrders = [];
    for (const order of this.orders.values()) {
      if (order.userId === userId && ['OPEN', 'PARTIALLY_FILLED'].includes(order.status)) {
        userOrders.push(order);
      }
    }
    return userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  cancelOrder(orderId, userId) {
    const order = this.orders.get(orderId);
    
    if (!order) throw new Error('Order not found');
    if (order.userId !== userId) throw new Error('Order not owned by user');
    if (!['OPEN', 'PARTIALLY_FILLED'].includes(order.status)) {
      throw new Error(`Cannot cancel order with status: ${order.status}`);
    }
    
    // Remove from orderbook
    const book = this.orderbooks[order.pair];
    const targetBook = order.side === 'BUY' ? book.bids : book.asks;
    const orderIndex = targetBook.findIndex(o => o.id === orderId);
    
    if (orderIndex > -1) {
      targetBook.splice(orderIndex, 1);
    }
    
    order.status = 'CANCELLED';
    order.cancelledAt = new Date().toISOString();
    
    return order;
  }

  getTradeHistory(pair, limit = 50) {
    return this.tradeHistory
      .filter(trade => !pair || trade.pair === pair)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  getMarketSummary() {
    const summary = {};
    for (const [pair, book] of Object.entries(this.orderbooks)) {
      summary[pair] = {
        lastPrice: book.lastPrice,
        volume24h: book.volume24h,
        priceChange24h: 0 // Simplified
      };
    }
    return summary;
  }

  getStats() {
    return {
      totalOrders: this.orders.size,
      supportedPairs: Object.keys(this.orderbooks).length,
      uptime: process.uptime()
    };
  }
}

module.exports = new MatchingEngine();
