import { WalletBackupService } from '../src/lib/services/walletBackupService';
import { WalletService } from '../src/lib/services/walletService';

// Mock data
const mockWallet = {
  id: 'test-wallet-id',
  user_id: 'test-user-id',
  name: 'Test Wallet',
  type: 'personal',
  currency: 'USD',
  balance: 100,
  is_primary: true,
  status: 'active',
  created_at: '2025-09-30T12:00:00Z',
  updated_at: '2025-09-30T12:00:00Z'
};

const mockTransaction = {
  id: 'test-transaction-id',
  wallet_id: 'test-wallet-id',
  amount: 50,
  currency: 'USD',
  type: 'deposit',
  status: 'completed',
  description: 'Test Transaction',
  created_at: '2025-09-30T12:00:00Z',
  updated_at: '2025-09-30T12:00:00Z'
};

const mockBackup = {
  id: 'test-backup-id',
  userId: 'test-user-id',
  timestamp: '2025-09-30T12:00:00Z',
  encryptedData: 'encrypted-data',
  walletCount: 1,
  transactionCount: 1,
  size: 1000,
  checksum: 'test-checksum',
  metadata: {}
};

// Mock the Supabase client
jest.mock('../src/lib/supabaseSingleton', () => {
  return {
    getSupabaseClient: jest.fn().mockReturnValue({
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockReturnValue({ data: mockWallet, error: null })
          })
        }),
        upsert: jest.fn().mockReturnValue({ error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            neq: jest.fn().mockResolvedValue({ error: null }),
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockReturnValue({ data: mockWallet, error: null })
            })
          })
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockReturnValue({ data: mockBackup, error: null }),
            order: jest.fn().mockReturnValue({ data: [mockBackup], error: null })
          }),
          order: jest.fn().mockReturnValue({ data: [mockBackup], error: null })
        })
      }),
      rpc: jest.fn().mockResolvedValue({ data: null, error: null })
    })
  };
});

// Mock the WalletService
jest.mock('../src/lib/services/walletService');

describe('WalletBackupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup WalletService mocks
    (WalletService.getUserWallets as jest.Mock).mockResolvedValue([mockWallet]);
    (WalletService.getWallet as jest.Mock).mockResolvedValue(mockWallet);
    (WalletService.getTransactionHistory as jest.Mock).mockResolvedValue({
      transactions: [mockTransaction],
      pagination: { total: 1, offset: 0, limit: 10, hasMore: false }
    });
  });
  
  describe('createBackup', () => {
    it('should create a backup successfully', async () => {
      const result = await WalletBackupService.createBackup('test-user-id');
      
      expect(result).toBeDefined();
      expect(WalletService.getUserWallets).toHaveBeenCalledWith('test-user-id');
    });
    
    it('should include transactions when specified', async () => {
      const result = await WalletBackupService.createBackup('test-user-id', {
        includeTransactions: true
      });
      
      expect(result).toBeDefined();
      expect(WalletService.getTransactionHistory).toHaveBeenCalled();
    });
  });
  
  describe('getBackups', () => {
    it('should retrieve user backups', async () => {
      const result = await WalletBackupService.getBackups('test-user-id');
      
      expect(result).toEqual([mockBackup]);
    });
  });
  
  describe('getBackup', () => {
    it('should retrieve a specific backup', async () => {
      const result = await WalletBackupService.getBackup('test-backup-id');
      
      expect(result).toEqual(mockBackup);
    });
  });
  
  describe('restoreFromBackup', () => {
    it('should restore from a backup', async () => {
      const result = await WalletBackupService.restoreFromBackup('test-backup-id');
      
      expect(result).toEqual({ walletsRestored: 0, transactionsRestored: 0 });
    });
  });
});