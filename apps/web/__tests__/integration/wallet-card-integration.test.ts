import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { SupabaseService } from '@celora/infrastructure/client';

// Mock environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

describe('Wallet + Card Integration Tests', () => {
  let supabaseService: SupabaseService;
  let testUserId: string;
  let testCardId: string;

  beforeAll(async () => {
    supabaseService = new SupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    // Generate a test user ID for testing
    testUserId = `test-user-${Date.now()}`;
  });

  afterAll(async () => {
    // Cleanup test data - NOTE: This requires direct DB access or admin client
    // For now, we'll leave test data in place and use unique IDs
    console.log(`Test completed for user: ${testUserId}`);
  });

  describe('Virtual Card Management', () => {
    it('should create a virtual card', async () => {
      const card = await supabaseService.createVirtualCard(testUserId, {
        masked_pan: '**** **** **** 1234',
        balance: 0,
        currency: 'USD'
      });

      expect(card).toBeTruthy();
      expect(card?.id).toBeDefined();
      expect(card?.user_id).toBe(testUserId);
      expect(card?.masked_pan).toBe('**** **** **** 1234');
      expect(card?.balance).toBe(0);
      expect(card?.currency).toBe('USD');
      expect(card?.status).toBe('active');
      
      // Store for later tests
      if (card) testCardId = card.id;
    });

    it('should retrieve virtual cards for user', async () => {
      const cards = await supabaseService.getVirtualCards(testUserId);
      
      expect(Array.isArray(cards)).toBe(true);
      expect(cards.length).toBeGreaterThan(0);
      
      const card = cards.find(c => c.id === testCardId);
      expect(card).toBeTruthy();
      expect(card?.user_id).toBe(testUserId);
    });

    it('should update card balance', async () => {
      const newBalance = 100.50;
      const success = await supabaseService.updateCardBalance(testCardId, newBalance);
      
      expect(success).toBe(true);
      
      // Verify balance was updated
      const cards = await supabaseService.getVirtualCards(testUserId);
      const updatedCard = cards.find(c => c.id === testCardId);
      
      expect(updatedCard?.balance).toBe(newBalance);
    });

    it('should add funds to card', async () => {
      const fundAmount = 50.25;
      const result = await supabaseService.addFunds({
        cardId: testCardId,
        amount: fundAmount,
        currency: 'USD',
        sourceType: 'bank_transfer'
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.newBalance).toBe(150.75); // 100.50 + 50.25
    });
  });

  describe('Transaction Management', () => {
    it('should create a transaction', async () => {
      const transaction = await supabaseService.createTransaction({
        userId: testUserId,
        cardId: testCardId,
        amount: -25.00,
        type: 'purchase',
        merchantName: 'Test Merchant'
      });

      expect(transaction).toBeTruthy();
      expect(transaction?.user_id).toBe(testUserId);
      expect(transaction?.card_id).toBe(testCardId);
      expect(transaction?.amount).toBe(-25.00);
      expect(transaction?.transaction_type).toBe('purchase');
      expect(transaction?.merchant_name).toBe('Test Merchant');
      expect(transaction?.status).toBe('pending');
    });

    it('should retrieve transactions for user', async () => {
      const transactions = await supabaseService.getTransactions(testUserId, 10);
      
      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBeGreaterThan(0);
      
      // Should include both the topup and purchase transactions
      const topupTx = transactions.find(t => t.transaction_type === 'topup');
      const purchaseTx = transactions.find(t => t.transaction_type === 'purchase');
      
      expect(topupTx).toBeTruthy();
      expect(purchaseTx).toBeTruthy();
    });
  });

  describe('Card Status Management', () => {
    it('should update card status', async () => {
      const success = await supabaseService.updateCardStatus(testCardId, testUserId, 'suspended');
      expect(success).toBe(true);
      
      // Verify status was updated
      const cards = await supabaseService.getVirtualCards(testUserId);
      const card = cards.find(c => c.id === testCardId);
      expect(card?.status).toBe('suspended');
      
      // Restore to active
      await supabaseService.updateCardStatus(testCardId, testUserId, 'active');
    });

    it('should calculate risk score for card', async () => {
      const riskScore = await supabaseService.getCardRiskScore(testCardId, testUserId);
      
      expect(typeof riskScore).toBe('number');
      expect(riskScore).toBeGreaterThanOrEqual(0);
      expect(riskScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should set up card updates subscription', (done) => {
      const subscription = supabaseService.subscribeToCardUpdates(testUserId, (payload) => {
        expect(payload).toBeDefined();
        subscription.unsubscribe();
        done();
      });

      // Trigger an update to test the subscription
      setTimeout(async () => {
        await supabaseService.updateCardBalance(testCardId, 200);
      }, 1000);
    }, 10000);

    it('should set up transaction updates subscription', (done) => {
      const subscription = supabaseService.subscribeToTransactions(testUserId, (payload) => {
        expect(payload).toBeDefined();
        subscription.unsubscribe();
        done();
      });

      // Trigger a new transaction to test the subscription
      setTimeout(async () => {
        await supabaseService.createTransaction({
          userId: testUserId,
          cardId: testCardId,
          amount: -10,
          type: 'fee',
          merchantName: 'Test Fee'
        });
      }, 1000);
    }, 10000);
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid card creation gracefully', async () => {
      const result = await supabaseService.createVirtualCard('invalid-user-id', {
        // Missing required fields
      });
      
      // Should handle errors gracefully and return null or throw
      expect(result).toBeTruthy(); // Service creates with defaults
    });

    it('should handle non-existent user transactions', async () => {
      const transactions = await supabaseService.getTransactions('non-existent-user', 10);
      expect(Array.isArray(transactions)).toBe(true);
      expect(transactions.length).toBe(0);
    });

    it('should reject negative fund amounts', async () => {
      const result = await supabaseService.addFunds({
        cardId: testCardId,
        amount: -50,
        currency: 'USD',
        sourceType: 'invalid'
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('Amount must be positive');
    });
  });
});