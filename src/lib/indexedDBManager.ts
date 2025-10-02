'use client';

/**
 * IndexedDB Manager for Offline Data Storage
 * 
 * This module handles all offline storage operations including:
 * - Transaction queue for when offline
 * - Analytics data buffering
 * - User preferences caching
 * - Sync status tracking
 */

interface OfflineTransaction {
  id: string;
  type: 'transfer' | 'card_payment' | 'card_topup' | 'card_create';
  amount: number;
  currency: string;
  recipientId?: string;
  cardId?: string;
  description?: string;
  timestamp: number;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  metadata?: Record<string, any>;
}

interface OfflineAnalytics {
  id?: number;
  event: string;
  userId: string;
  data: Record<string, any>;
  timestamp: number;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
}

interface CachedData {
  key: string;
  data: any;
  timestamp: number;
  expiry: number;
}

class IndexedDBManager {
  private dbName = 'CeloraOfflineDB';
  private version = 3;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initializeDB();
  }

  /**
   * Initialize IndexedDB connection
   */
  async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const transactionStore = db.createObjectStore('transactions', { 
            keyPath: 'id' 
          });
          transactionStore.createIndex('timestamp', 'timestamp');
          transactionStore.createIndex('syncStatus', 'syncStatus');
          transactionStore.createIndex('type', 'type');
        }

        // Create analytics store
        if (!db.objectStoreNames.contains('analytics')) {
          const analyticsStore = db.createObjectStore('analytics', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          analyticsStore.createIndex('timestamp', 'timestamp');
          analyticsStore.createIndex('syncStatus', 'syncStatus');
          analyticsStore.createIndex('event', 'event');
        }

        // Create cache store
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { 
            keyPath: 'key' 
          });
          cacheStore.createIndex('timestamp', 'timestamp');
          cacheStore.createIndex('expiry', 'expiry');
        }

        // Create sync status store
        if (!db.objectStoreNames.contains('syncStatus')) {
          const syncStore = db.createObjectStore('syncStatus', { 
            keyPath: 'id' 
          });
          syncStore.createIndex('lastSync', 'lastSync');
        }

        // Create user preferences store
        if (!db.objectStoreNames.contains('preferences')) {
          const preferencesStore = db.createObjectStore('preferences', { 
            keyPath: 'key' 
          });
        }

        console.log('IndexedDB schema updated to version', this.version);
      };
    });
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initializeDB();
    }
    if (!this.db) {
      throw new Error('Database not available');
    }
    return this.db;
  }

  // =======================================================================
  // Transaction Management
  // =======================================================================

  /**
   * Add transaction to offline queue
   */
  async addOfflineTransaction(transaction: Omit<OfflineTransaction, 'syncStatus' | 'retryCount'>): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['transactions'], 'readwrite');
      const store = tx.objectStore('transactions');
      
      const offlineTransaction: OfflineTransaction = {
        ...transaction,
        syncStatus: 'pending',
        retryCount: 0
      };
      
      const request = store.add(offlineTransaction);
      
      request.onsuccess = () => {
        console.log('Transaction added to offline queue:', transaction.id);
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error('Failed to add transaction to offline queue'));
      };
    });
  }

  /**
   * Get all pending transactions
   */
  async getPendingTransactions(): Promise<OfflineTransaction[]> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['transactions'], 'readonly');
      const store = tx.objectStore('transactions');
      const index = store.index('syncStatus');
      
      const request = index.getAll('pending');
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get pending transactions'));
      };
    });
  }

  /**
   * Update transaction sync status
   */
  async updateTransactionStatus(
    id: string, 
    status: OfflineTransaction['syncStatus'], 
    incrementRetry = false
  ): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['transactions'], 'readwrite');
      const store = tx.objectStore('transactions');
      
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const transaction = getRequest.result;
        if (transaction) {
          transaction.syncStatus = status;
          if (incrementRetry) {
            transaction.retryCount = (transaction.retryCount || 0) + 1;
          }
          
          const updateRequest = store.put(transaction);
          
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(new Error('Failed to update transaction status'));
        } else {
          reject(new Error('Transaction not found'));
        }
      };
      
      getRequest.onerror = () => {
        reject(new Error('Failed to get transaction'));
      };
    });
  }

  /**
   * Remove synced transaction from queue
   */
  async removeTransaction(id: string): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['transactions'], 'readwrite');
      const store = tx.objectStore('transactions');
      
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log('Transaction removed from offline queue:', id);
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error('Failed to remove transaction'));
      };
    });
  }

  // =======================================================================
  // Analytics Management
  // =======================================================================

  /**
   * Add analytics event to offline queue
   */
  async addAnalyticsEvent(event: Omit<OfflineAnalytics, 'id' | 'syncStatus'>): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['analytics'], 'readwrite');
      const store = tx.objectStore('analytics');
      
      const analyticsEvent: Omit<OfflineAnalytics, 'id'> = {
        ...event,
        syncStatus: 'pending'
      };
      
      const request = store.add(analyticsEvent);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject(new Error('Failed to add analytics event'));
      };
    });
  }

  /**
   * Get all pending analytics events
   */
  async getPendingAnalytics(): Promise<OfflineAnalytics[]> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['analytics'], 'readonly');
      const store = tx.objectStore('analytics');
      const index = store.index('syncStatus');
      
      const request = index.getAll('pending');
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get pending analytics'));
      };
    });
  }

  /**
   * Clear all synced analytics events
   */
  async clearSyncedAnalytics(): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['analytics'], 'readwrite');
      const store = tx.objectStore('analytics');
      const index = store.index('syncStatus');
      
      const request = index.openCursor(IDBKeyRange.only('synced'));
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => {
        reject(new Error('Failed to clear synced analytics'));
      };
    });
  }

  // =======================================================================
  // Cache Management
  // =======================================================================

  /**
   * Store data in cache with expiry
   */
  async cacheData(key: string, data: any, expiryMinutes = 60): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['cache'], 'readwrite');
      const store = tx.objectStore('cache');
      
      const timestamp = Date.now();
      const expiry = timestamp + (expiryMinutes * 60 * 1000);
      
      const cacheItem: CachedData = {
        key,
        data,
        timestamp,
        expiry
      };
      
      const request = store.put(cacheItem);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to cache data'));
    });
  }

  /**
   * Retrieve data from cache
   */
  async getCachedData(key: string): Promise<any | null> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['cache'], 'readonly');
      const store = tx.objectStore('cache');
      
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        
        if (!result) {
          resolve(null);
          return;
        }
        
        // Check if data has expired
        if (Date.now() > result.expiry) {
          // Remove expired data
          this.removeCachedData(key);
          resolve(null);
        } else {
          resolve(result.data);
        }
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get cached data'));
      };
    });
  }

  /**
   * Remove cached data
   */
  async removeCachedData(key: string): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['cache'], 'readwrite');
      const store = tx.objectStore('cache');
      
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to remove cached data'));
    });
  }

  /**
   * Clean expired cache entries
   */
  async cleanExpiredCache(): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['cache'], 'readwrite');
      const store = tx.objectStore('cache');
      const index = store.index('expiry');
      
      const now = Date.now();
      const request = index.openCursor(IDBKeyRange.upperBound(now));
      
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => {
        reject(new Error('Failed to clean expired cache'));
      };
    });
  }

  // =======================================================================
  // User Preferences
  // =======================================================================

  /**
   * Store user preference
   */
  async setPreference(key: string, value: any): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['preferences'], 'readwrite');
      const store = tx.objectStore('preferences');
      
      const request = store.put({ key, value });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to set preference'));
    });
  }

  /**
   * Get user preference
   */
  async getPreference(key: string): Promise<any | null> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['preferences'], 'readonly');
      const store = tx.objectStore('preferences');
      
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get preference'));
      };
    });
  }

  // =======================================================================
  // Sync Status Management
  // =======================================================================

  /**
   * Update last sync timestamp
   */
  async updateSyncStatus(type: string): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['syncStatus'], 'readwrite');
      const store = tx.objectStore('syncStatus');
      
      const request = store.put({
        id: type,
        lastSync: Date.now()
      });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to update sync status'));
    });
  }

  /**
   * Get last sync timestamp
   */
  async getLastSync(type: string): Promise<number | null> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['syncStatus'], 'readonly');
      const store = tx.objectStore('syncStatus');
      
      const request = store.get(type);
      
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.lastSync : null);
      };
      
      request.onerror = () => {
        reject(new Error('Failed to get sync status'));
      };
    });
  }

  // =======================================================================
  // Utility Methods
  // =======================================================================

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    pendingTransactions: number;
    pendingAnalytics: number;
    cacheEntries: number;
    preferences: number;
  }> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['transactions', 'analytics', 'cache', 'preferences'], 'readonly');
      
      const promises = [
        this.countRecords(tx.objectStore('transactions').index('syncStatus'), 'pending'),
        this.countRecords(tx.objectStore('analytics').index('syncStatus'), 'pending'),
        this.countRecords(tx.objectStore('cache')),
        this.countRecords(tx.objectStore('preferences'))
      ];
      
      Promise.all(promises).then(([pendingTransactions, pendingAnalytics, cacheEntries, preferences]) => {
        resolve({
          pendingTransactions,
          pendingAnalytics,
          cacheEntries,
          preferences
        });
      }).catch(reject);
    });
  }

  private countRecords(store: IDBObjectStore | IDBIndex, query?: any): Promise<number> {
    return new Promise((resolve, reject) => {
      const request = query ? store.count(query) : store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Failed to count records'));
    });
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['transactions', 'analytics', 'cache', 'preferences', 'syncStatus'], 'readwrite');
      
      const promises = [
        tx.objectStore('transactions').clear(),
        tx.objectStore('analytics').clear(),
        tx.objectStore('cache').clear(),
        tx.objectStore('preferences').clear(),
        tx.objectStore('syncStatus').clear()
      ];
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error('Failed to clear database'));
    });
  }
}

// Create singleton instance
const indexedDBManager = new IndexedDBManager();

export default indexedDBManager;
export type { OfflineTransaction, OfflineAnalytics, CachedData };
