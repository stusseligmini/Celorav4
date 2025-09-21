import { SupabaseService } from './supabaseService';
import { CeloraSecurityService, EncryptedData, SecurityState } from './celoraSecurity';
import { logger } from './logger';
import { createAuditEvent } from '@celora/domain';
import { SolanaService } from './solanaService';

// Address validation helpers
function validateSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

function validateEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function validateBitcoinAddress(address: string): boolean {
  return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,87}$/.test(address);
}

export interface CryptoWallet {
  id: string;
  userId: string;
  type: 'solana' | 'ethereum' | 'bitcoin';
  address: string;
  encryptedPrivateKey: EncryptedData;
  balance: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletOperation {
  id: string;
  walletId: string;
  type: 'send' | 'receive' | 'stake' | 'unstake' | 'swap';
  amount: number;
  currency: string;
  toAddress?: string;
  fromAddress?: string;
  transactionHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
  metadata?: Record<string, any>;
  createdAt: Date;
}

export class WalletLockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletLockedError';
  }
}

export class CeloraWalletService {
  private supabase: SupabaseService;
  private security: CeloraSecurityService;
  private solana: SolanaService;

  constructor(supabaseUrl?: string, supabaseKey?: string, encryptionKey?: string) {
    this.supabase = new SupabaseService(supabaseUrl, supabaseKey);
    this.security = new CeloraSecurityService(encryptionKey);
    this.solana = new SolanaService({});
  }

  /**
   * Create a new crypto wallet for user (integrates Python wallet logic)
   */
  async createWallet(
    userId: string,
    walletType: 'solana' | 'ethereum' | 'bitcoin',
    address: string,
    privateKey: string,
    pin: string
  ): Promise<{ success: boolean; walletId?: string; error?: string }> {
    try {
      // Get user security state
      const securityState = await this.getUserSecurityState(userId);
      
      if (this.security.isAccountLocked(securityState)) {
        throw new WalletLockedError('Account is locked due to failed attempts');
      }

      // Validate address format using local validators
      const isValidAddress = walletType === 'solana' ? validateSolanaAddress(address) :
                            walletType === 'ethereum' ? validateEthereumAddress(address) :
                            validateBitcoinAddress(address);
      
      if (!isValidAddress) {
        return { success: false, error: 'Invalid wallet address format' };
      }

      // Encrypt private key (wrap with version metadata)
      const encryptedPrivateKeyRaw = this.security.encrypt(privateKey);
      const encryptedPrivateKey = { version: 1, ...encryptedPrivateKeyRaw };
      
      // Hash PIN for storage
      const pinHash = this.security.hashPin(pin);

      // Create wallet in database
      const { data: wallet, error } = await (this.supabase as any).supabase
        .from('crypto_wallets')
        .insert({
          user_id: userId,
          type: walletType,
          address,
          encrypted_private_key: JSON.stringify(encryptedPrivateKey),
          balance: 0,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to create wallet');
        return { success: false, error: 'Database error' };
      }

      // Store user security state
      await this.updateUserSecurity(userId, pinHash.hash, pinHash.salt);

      // Audit log (use 'card' as closest entity type)
      await this.supabase.createAuditLog(createAuditEvent({
        actorUserId: userId,
        entityType: 'card',
        entityId: wallet.id,
        action: 'wallet_created',
        metadata: { walletType, address: this.maskAddress(address) }
      }));

      logger.info('Crypto wallet created');
      return { success: true, walletId: wallet.id };

    } catch (error) {
      if (error instanceof WalletLockedError) {
        return { success: false, error: error.message };
      }
      logger.error('Wallet creation failed');
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Add encrypted virtual card to wallet (integrates Python card logic)
   */
  async addVirtualCard(
    userId: string,
    cardNumber: string,
    expiry: string,
    cvv: string,
    pin: string
  ): Promise<{ success: boolean; cardId?: string; error?: string }> {
    try {
      // Verify PIN first
      const pinValid = await this.verifyPin(userId, pin);
      if (!pinValid.success) {
        return { success: false, error: pinValid.error };
      }

      // Validate card data (matches Python implementation)
      if (!this.security.validateCardNumber(cardNumber)) {
        return { success: false, error: 'Invalid card number (failed Luhn check)' };
      }

      if (!this.security.validateExpiry(expiry)) {
        return { success: false, error: 'Invalid or expired card' };
      }

      if (!/^\d{3,4}$/.test(cvv)) {
        return { success: false, error: 'Invalid CVV' };
      }

      // Encrypt card data
      const cardData = JSON.stringify({ cardNumber, expiry, cvv });
      const encryptedCard = this.security.encrypt(cardData);

      // Store in database using existing virtual_cards table
      const cardId = this.security.generateSecureToken(16);
      const maskedPan = this.security.maskCardNumber(cardNumber);

      const { error } = await (this.supabase as any).supabase
        .from('virtual_cards')
        .insert({
          id: cardId,
          user_id: userId,
          masked_pan: maskedPan,
          encrypted_payload: JSON.stringify(encryptedCard),
          balance: 0,
          currency: 'USD',
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        });

      if (error) {
        logger.error('Failed to add virtual card');
        return { success: false, error: 'Database error' };
      }

      // Audit log
      await this.supabase.createAuditLog(createAuditEvent({
        actorUserId: userId,
        entityType: 'card',
        entityId: cardId,
        action: 'card_added',
        metadata: { maskedPan }
      }));

      logger.info('Virtual card added');
      return { success: true, cardId };

    } catch (error) {
      logger.error('Add card failed');
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * Get decrypted card details (requires PIN verification)
   */
  async getCardDetails(
    userId: string,
    cardId: string,
    pin: string
  ): Promise<{ success: boolean; cardData?: any; error?: string }> {
    try {
      // Verify PIN
      const pinValid = await this.verifyPin(userId, pin);
      if (!pinValid.success) {
        return { success: false, error: pinValid.error };
      }

      // Get encrypted card
      const { data: card, error } = await (this.supabase as any).supabase
        .from('virtual_cards')
        .select('*')
        .eq('id', cardId)
        .eq('user_id', userId)
        .single();

      if (error || !card) {
        return { success: false, error: 'Card not found' };
      }

      // Decrypt card data
      const encryptedData = JSON.parse(card.encrypted_payload);
      const decryptedData = this.security.decrypt(encryptedData);
      const cardData = JSON.parse(decryptedData);

      // Audit log
      await this.supabase.createAuditLog(createAuditEvent({
        actorUserId: userId,
        entityType: 'card',
        entityId: cardId,
        action: 'card_accessed',
        metadata: { maskedPan: card.masked_pan }
      }));

      return { success: true, cardData };

    } catch (error) {
      logger.error('Get card details failed');
      return { success: false, error: 'Access denied' };
    }
  }

  /**
   * Verify user PIN (matches Python implementation behavior)
   */
  async verifyPin(userId: string, pin: string): Promise<{ success: boolean; error?: string }> {
    try {
      const securityState = await this.getUserSecurityState(userId);
      
      if (this.security.isAccountLocked(securityState)) {
        const lockTime = new Date(securityState.lockedUntil).toLocaleString();
        return { success: false, error: `Account locked until ${lockTime}` };
      }

      // Get stored PIN hash
      const { data: userSecurity, error } = await (this.supabase as any).supabase
        .from('user_security')
        .select('hashed_pin')
        .eq('user_id', userId)
        .single();

      if (error || !userSecurity) {
        return { success: false, error: 'User security not found' };
      }

      // Verify PIN
      const isValid = this.security.verifyPin(pin, userSecurity.hashed_pin);
      
      // Update security state
      const newSecurityState = this.security.updateSecurityState(securityState, isValid);
      await this.updateUserSecurityState(userId, newSecurityState);

      if (!isValid) {
        return { success: false, error: 'Invalid PIN' };
      }

      return { success: true };

    } catch (error) {
      logger.error('PIN verification failed');
      return { success: false, error: 'Verification error' };
    }
  }

  /**
   * List user's wallets and cards
   */
  async listUserAssets(userId: string): Promise<{
    wallets: CryptoWallet[];
    cards: Array<{ id: string; maskedPan: string; balance: number; status: string }>;
  }> {
    try {
      // Get crypto wallets
      const { data: wallets } = await (this.supabase as any).supabase
        .from('crypto_wallets')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      // Get virtual cards
      const { data: cards } = await (this.supabase as any).supabase
        .from('virtual_cards')
        .select('id, masked_pan, balance, status')
        .eq('user_id', userId);

      return {
        wallets: wallets || [],
        cards: cards || []
      };

    } catch (error) {
      logger.error('Failed to list user assets');
      return { wallets: [], cards: [] };
    }
  }

  /**
   * Refresh balances for all active Solana wallets of the user (best-effort; logs errors per wallet)
   */
  async refreshSolanaBalances(userId: string): Promise<{ updated: number; failures: number }> {
    const { data: wallets, error } = await (this.supabase as any).supabase
      .from('crypto_wallets')
      .select('id, address, last_known_slot')
      .eq('user_id', userId)
      .eq('type', 'solana')
      .eq('is_active', true);

    if (error || !wallets) {
      logger.error({ error }, 'Failed to load user solana wallets');
      return { updated: 0, failures: 0 };
    }

    let updated = 0, failures = 0;
    for (const w of wallets) {
      try {
        const { balance, slot } = await this.solana.syncBalance(w.address, async ({ balance, slot, ts }) => {
          // stale guard: only update if no prior slot or newer slot
          if (w.last_known_slot && typeof w.last_known_slot === 'number' && slot < w.last_known_slot) return;
          await (this.supabase as any).supabase
            .from('crypto_wallets')
            .update({ balance, last_known_slot: slot, last_balance_sync_at: ts, updated_at: new Date() })
            .eq('id', w.id);
        });
        updated++;
        // Audit (non-blocking)
        this.supabase.createAuditLog(createAuditEvent({
          actorUserId: userId,
          entityType: 'card',
          entityId: w.id,
          action: 'wallet_balance_synced',
          metadata: { address: this.maskAddress(w.address), balance, slot }
        }));
      } catch (e: any) {
        failures++;
        logger.warn({ walletId: w.id, error: e?.message }, 'Solana balance sync failed');
      }
    }
    return { updated, failures };
  }

  // Private helper methods
  private async getUserSecurityState(userId: string): Promise<SecurityState> {
    const { data } = await (this.supabase as any).supabase
      .from('user_security')
      .select('failed_attempts, locked_until, last_attempt')
      .eq('user_id', userId)
      .single();

    return {
      failedAttempts: data?.failed_attempts || 0,
      lockedUntil: data?.locked_until ? new Date(data.locked_until).getTime() : 0,
      lastAttempt: data?.last_attempt ? new Date(data.last_attempt).getTime() : 0
    };
  }

  private async updateUserSecurityState(userId: string, state: SecurityState): Promise<void> {
    await (this.supabase as any).supabase
      .from('user_security')
      .upsert({
        user_id: userId,
        failed_attempts: state.failedAttempts,
        locked_until: state.lockedUntil > 0 ? new Date(state.lockedUntil) : null,
        last_attempt: new Date(state.lastAttempt)
      });
  }

  private async updateUserSecurity(userId: string, hashedPin: string, salt: string): Promise<void> {
    await (this.supabase as any).supabase
      .from('user_security')
      .upsert({
        user_id: userId,
        hashed_pin: hashedPin,
        salt,
        failed_attempts: 0,
        locked_until: null,
        last_login_at: new Date()
      });
  }

  private maskAddress(address: string): string {
    if (address.length <= 8) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
}