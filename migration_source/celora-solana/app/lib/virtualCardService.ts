import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface VirtualCardRecord {
  id: string;
  user_id: string;
  card_type: 'debit' | 'credit';
  holder_name: string;
  spending_limit: number;
  is_active: boolean;
  is_frozen: boolean;
  balance: number;
  encrypted_card_data: string; // Contains card number, expiry, CVV
  created_at: string;
  updated_at: string;
}

export interface CardTransaction {
  id: string;
  card_id: string;
  amount: number;
  merchant: string;
  description: string;
  transaction_type: 'purchase' | 'refund' | 'fee' | 'funding';
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export class VirtualCardService {
  private encryptionKey: string;

  constructor(userMasterPassword: string) {
    // Derive encryption key from master password
    this.encryptionKey = CryptoJS.SHA256(userMasterPassword + 'celora-cards').toString();
  }

  private encryptCardData(cardNumber: string, expiryDate: string, cvv: string): string {
    const cardData = JSON.stringify({ cardNumber, expiryDate, cvv });
    return CryptoJS.AES.encrypt(cardData, this.encryptionKey).toString();
  }

  private decryptCardData(encryptedData: string): { cardNumber: string; expiryDate: string; cvv: string } {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.encryptionKey);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedData);
  }

  // Generate a new virtual card
  async createVirtualCard(
    userId: string,
    holderName: string,
    cardType: 'debit' | 'credit',
    spendingLimit: number
  ): Promise<VirtualCardRecord | null> {
    try {
      // Generate card details
      const cardNumber = this.generateCardNumber();
      const expiryDate = this.generateExpiryDate();
      const cvv = this.generateCVV();

      // Encrypt sensitive data
      const encryptedCardData = this.encryptCardData(cardNumber, expiryDate, cvv);

      const newCard = {
        user_id: userId,
        card_type: cardType,
        holder_name: holderName,
        spending_limit: spendingLimit,
        is_active: true,
        is_frozen: false,
        balance: 0,
        encrypted_card_data: encryptedCardData
      };

      const { data, error } = await supabase
        .from('virtual_cards')
        .insert([newCard])
        .select()
        .single();

      if (error) {
        console.error('Error creating virtual card:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to create virtual card:', error);
      return null;
    }
  }

  // Get all cards for a user
  async getUserCards(userId: string): Promise<VirtualCardRecord[]> {
    try {
      const { data, error } = await supabase
        .from('virtual_cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user cards:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch user cards:', error);
      return [];
    }
  }

  // Get card details (with decrypted sensitive data)
  async getCardDetails(cardId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('virtual_cards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (error || !data) {
        console.error('Error fetching card details:', error);
        return null;
      }

      // Decrypt card data
      const cardData = this.decryptCardData(data.encrypted_card_data);

      return {
        ...data,
        cardNumber: cardData.cardNumber,
        expiryDate: cardData.expiryDate,
        cvv: cardData.cvv
      };
    } catch (error) {
      console.error('Failed to get card details:', error);
      return null;
    }
  }

  // Update card settings
  async updateCard(
    cardId: string, 
    updates: Partial<Pick<VirtualCardRecord, 'holder_name' | 'spending_limit' | 'is_active' | 'is_frozen'>>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('virtual_cards')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', cardId);

      if (error) {
        console.error('Error updating card:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to update card:', error);
      return false;
    }
  }

  // Delete a card
  async deleteCard(cardId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('virtual_cards')
        .delete()
        .eq('id', cardId);

      if (error) {
        console.error('Error deleting card:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to delete card:', error);
      return false;
    }
  }

  // Fund a card from crypto wallet
  async fundCard(cardId: string, amount: number): Promise<boolean> {
    try {
      // Get current card balance
      const { data: card } = await supabase
        .from('virtual_cards')
        .select('balance')
        .eq('id', cardId)
        .single();

      if (!card) return false;

      const newBalance = card.balance + amount;

      // Update card balance
      const { error: updateError } = await supabase
        .from('virtual_cards')
        .update({ balance: newBalance })
        .eq('id', cardId);

      if (updateError) {
        console.error('Error funding card:', updateError);
        return false;
      }

      // Record the funding transaction
      await this.recordTransaction(cardId, amount, 'Crypto Funding', 'funding');

      return true;
    } catch (error) {
      console.error('Failed to fund card:', error);
      return false;
    }
  }

  // Record a transaction
  async recordTransaction(
    cardId: string,
    amount: number,
    merchant: string,
    type: CardTransaction['transaction_type'],
    description?: string
  ): Promise<boolean> {
    try {
      const transaction: Omit<CardTransaction, 'id' | 'created_at'> = {
        card_id: cardId,
        amount,
        merchant,
        description: description || `${type} transaction`,
        transaction_type: type,
        status: 'completed'
      };

      const { error } = await supabase
        .from('card_transactions')
        .insert([transaction]);

      if (error) {
        console.error('Error recording transaction:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to record transaction:', error);
      return false;
    }
  }

  // Get card transactions
  async getCardTransactions(cardId: string, limit: number = 50): Promise<CardTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('card_transactions')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      return [];
    }
  }

  // Helper methods for card generation
  private generateCardNumber(): string {
    // Generate a Visa card number (starting with 4)
    const prefix = '4532';
    let cardNumber = prefix;
    
    // Generate 12 more digits
    for (let i = 0; i < 12; i++) {
      cardNumber += Math.floor(Math.random() * 10);
    }

    return cardNumber;
  }

  private generateExpiryDate(): string {
    const now = new Date();
    const futureDate = new Date(now.getFullYear() + 3, now.getMonth());
    const month = String(futureDate.getMonth() + 1).padStart(2, '0');
    const year = String(futureDate.getFullYear()).slice(-2);
    return `${month}/${year}`;
  }

  private generateCVV(): string {
    return Math.floor(Math.random() * 900 + 100).toString();
  }
}

// Create database tables (run this once)
export const createVirtualCardTables = async () => {
  // Note: These would typically be created via Supabase migrations
  // This is just for reference
  
  const createCardsTable = `
    CREATE TABLE IF NOT EXISTS virtual_cards (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id TEXT NOT NULL,
      card_type TEXT CHECK (card_type IN ('debit', 'credit')) NOT NULL,
      holder_name TEXT NOT NULL,
      spending_limit DECIMAL(10,2) DEFAULT 1000.00,
      is_active BOOLEAN DEFAULT true,
      is_frozen BOOLEAN DEFAULT false,
      balance DECIMAL(10,2) DEFAULT 0.00,
      encrypted_card_data TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  const createTransactionsTable = `
    CREATE TABLE IF NOT EXISTS card_transactions (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      card_id UUID REFERENCES virtual_cards(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      merchant TEXT NOT NULL,
      description TEXT,
      transaction_type TEXT CHECK (transaction_type IN ('purchase', 'refund', 'fee', 'funding')) NOT NULL,
      status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  console.log('Database schema:');
  console.log(createCardsTable);
  console.log(createTransactionsTable);
};