/**
 * IndexedDB Manager for Celora V2
 * Handles offline storage for transactions, user data, and sync queue
 */

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: 'sent' | 'received' | 'pending';
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  timestamp: number;
  from?: string;
  to?: string;
  description?: string;
  category?: string;
  metadata?: Record<string, any>;
}

export interface WalletData {
  id: string;
  userId: string;
  balances: Record<string, number>;
  lastSync: number;
  isOffline: boolean;
}

export interface SyncQueueItem {
  id: string;
  type: 'transaction' | 'wallet_update' | 'profile_update' | 'card_operation';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  lastAttempt?: number;
}

export interface OfflineSettings {
  id: string;
  enableOfflineMode: boolean;
  maxOfflineTransactions: number;
  syncInterval: number;
  retentionDays: number;
  lastUpdate: number;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'CeloraDB';
  private readonly version = 1;

  // Store names
  private readonly stores = {
    TRANSACTIONS: 'transactions',
    WALLET_DATA: 'walletData',
    SYNC_QUEUE: 'syncQueue',
    OFFLINE_SETTINGS: 'offlineSettings',
    USER_CACHE: 'userCache',
    CARD_DATA: 'cardData'
  };

  /**
   * Initialize IndexedDB connection
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));
      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createObjectStores(db);
      };
    });
  }

  /**
   * Create object stores during database upgrade
   */
  private createObjectStores(db: IDBDatabase): void {
    // Transactions store
    if (!db.objectStoreNames.contains(this.stores.TRANSACTIONS)) {
      const transactionStore = db.createObjectStore(this.stores.TRANSACTIONS, { keyPath: 'id' });
      transactionStore.createIndex('timestamp', 'timestamp', { unique: false });
      transactionStore.createIndex('type', 'type', { unique: false });
      transactionStore.createIndex('status', 'status', { unique: false });
      transactionStore.createIndex('userId', 'userId', { unique: false });
    }

    // Wallet data store
    if (!db.objectStoreNames.contains(this.stores.WALLET_DATA)) {
      const walletStore = db.createObjectStore(this.stores.WALLET_DATA, { keyPath: 'id' });
      walletStore.createIndex('userId', 'userId', { unique: false });
      walletStore.createIndex('lastSync', 'lastSync', { unique: false });
    }

    // Sync queue store
    if (!db.objectStoreNames.contains(this.stores.SYNC_QUEUE)) {
      const syncStore = db.createObjectStore(this.stores.SYNC_QUEUE, { keyPath: 'id' });
      syncStore.createIndex('type', 'type', { unique: false });
      syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      syncStore.createIndex('retryCount', 'retryCount', { unique: false });
    }

    // Offline settings store
    if (!db.objectStoreNames.contains(this.stores.OFFLINE_SETTINGS)) {
      db.createObjectStore(this.stores.OFFLINE_SETTINGS, { keyPath: 'id' });
    }

    // User cache store
    if (!db.objectStoreNames.contains(this.stores.USER_CACHE)) {
      const userStore = db.createObjectStore(this.stores.USER_CACHE, { keyPath: 'id' });
      userStore.createIndex('lastUpdate', 'lastUpdate', { unique: false });
    }

    // Card data store (encrypted sensitive data)
    if (!db.objectStoreNames.contains(this.stores.CARD_DATA)) {
      const cardStore = db.createObjectStore(this.stores.CARD_DATA, { keyPath: 'id' });
      cardStore.createIndex('userId', 'userId', { unique: false });
      cardStore.createIndex('isActive', 'isActive', { unique: false });
    }
  }

  /**
   * Generic method to add data to a store
   */
  async add<T>(storeName: string, data: T): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to add data to ${storeName}`));
    });
  }

  /**
   * Generic method to update data in a store
   */
  async put<T>(storeName: string, data: T): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to update data in ${storeName}`));
    });
  }

  /**
   * Generic method to get data from a store
   */
  async get<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error(`Failed to get data from ${storeName}`));
    });
  }

  /**
   * Generic method to get all data from a store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(`Failed to get all data from ${storeName}`));
    });
  }

  /**
   * Generic method to delete data from a store
   */
  async delete(storeName: string, key: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete data from ${storeName}`));
    });
  }

  /**
   * Get data by index
   */
  async getByIndex<T>(storeName: string, indexName: string, key: any): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(key);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error(`Failed to get data by index from ${storeName}`));
    });
  }

  // =============================================================================
  // Transaction-specific methods
  // =============================================================================

  async addTransaction(transaction: Transaction): Promise<void> {
    return this.add(this.stores.TRANSACTIONS, transaction);
  }

  async getTransactions(userId?: string): Promise<Transaction[]> {
    if (userId) {
      return this.getByIndex<Transaction>(this.stores.TRANSACTIONS, 'userId', userId);
    }
    return this.getAll<Transaction>(this.stores.TRANSACTIONS);
  }

  async getTransactionsByStatus(status: string): Promise<Transaction[]> {
    return this.getByIndex<Transaction>(this.stores.TRANSACTIONS, 'status', status);
  }

  async updateTransaction(transaction: Transaction): Promise<void> {
    return this.put(this.stores.TRANSACTIONS, transaction);
  }

  // =============================================================================
  // Sync Queue methods
  // =============================================================================

  async addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<void> {
    const queueItem: SyncQueueItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    return this.add(this.stores.SYNC_QUEUE, queueItem);
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const items = await this.getAll<SyncQueueItem>(this.stores.SYNC_QUEUE);
    return items.sort((a, b) => a.timestamp - b.timestamp);
  }

  async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    return this.put(this.stores.SYNC_QUEUE, item);
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    return this.delete(this.stores.SYNC_QUEUE, id);
  }

  async clearCompletedSyncItems(): Promise<void> {
    const items = await this.getSyncQueue();
    const completedItems = items.filter(item => item.retryCount >= item.maxRetries);
    
    for (const item of completedItems) {
      await this.removeSyncQueueItem(item.id);
    }
  }

  // =============================================================================
  // Wallet Data methods
  // =============================================================================

  async saveWalletData(walletData: WalletData): Promise<void> {
    return this.put(this.stores.WALLET_DATA, walletData);
  }

  async getWalletData(userId: string): Promise<WalletData | null> {
    const wallets = await this.getByIndex<WalletData>(this.stores.WALLET_DATA, 'userId', userId);
    return wallets[0] || null;
  }

  // =============================================================================
  // Settings methods
  // =============================================================================

  async saveOfflineSettings(settings: OfflineSettings): Promise<void> {
    return this.put(this.stores.OFFLINE_SETTINGS, settings);
  }

  async getOfflineSettings(): Promise<OfflineSettings | null> {
    return this.get<OfflineSettings>(this.stores.OFFLINE_SETTINGS, 'default');
  }

  // =============================================================================
  // Cache cleanup methods
  // =============================================================================

  async cleanupExpiredData(retentionDays: number = 30): Promise<void> {
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    
    // Clean up old transactions
    const transactions = await this.getAll<Transaction>(this.stores.TRANSACTIONS);
    const expiredTransactions = transactions.filter(t => t.timestamp < cutoffTime);
    
    for (const transaction of expiredTransactions) {
      await this.delete(this.stores.TRANSACTIONS, transaction.id);
    }

    // Clean up old sync queue items
    const syncItems = await this.getSyncQueue();
    const expiredSyncItems = syncItems.filter(item => item.timestamp < cutoffTime);
    
    for (const item of expiredSyncItems) {
      await this.removeSyncQueueItem(item.id);
    }

    console.log(`Cleaned up ${expiredTransactions.length} transactions and ${expiredSyncItems.length} sync items`);
  }

  /**
   * Get database size and statistics
   */
  async getStorageInfo(): Promise<{ totalSize: number, stores: Record<string, number> }> {
    if (!this.db) throw new Error('Database not initialized');

    const info = {
      totalSize: 0,
      stores: {} as Record<string, number>
    };

    for (const storeName of Object.values(this.stores)) {
      const data = await this.getAll(storeName);
      const size = new Blob([JSON.stringify(data)]).size;
      info.stores[storeName] = size;
      info.totalSize += size;
    }

    return info;
  }

  /**
   * Clear all data (for debugging or reset)
   */
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    for (const storeName of Object.values(this.stores)) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to clear ${storeName}`));
      });
    }

    console.log('All IndexedDB data cleared');
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('IndexedDB connection closed');
    }
  }
}

// Export singleton instance
export const indexedDBManager = new IndexedDBManager();

// Initialize on import (with error handling)
if (typeof window !== 'undefined' && 'indexedDB' in window) {
  indexedDBManager.init().catch(console.error);
}
