// Celora Wallet Frontend Integration
class CeloraWalletUI {
  constructor(apiBaseUrl = 'https://celora-backend.onrender.com') {
    this.apiUrl = apiBaseUrl;
    this.currentWallet = null;
    this.isLocked = false;
    this.eventListeners = new Map();
  }

  // Event system for wallet operations
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => callback(data));
    }
  }

  async createWallet(owner, pin) {
    try {
      this.emit('wallet.creating', { owner });
      
      const response = await fetch(`${this.apiUrl}/api/wallets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: owner,
          pin: pin,
          wallet_type: 'secure_encrypted',
          features: ['virtual_cards', 'sling_payments', 'pin_protection'],
          security_level: 'enterprise'
        })
      });
      
      const result = await response.json();
      if (response.ok) {
        this.currentWallet = result;
        this.emit('wallet.created', result);
        this.showSuccess('Wallet created successfully!');
        return result;
      } else {
        this.emit('wallet.error', result);
        this.showError(result.error || 'Failed to create wallet');
        return null;
      }
    } catch (error) {
      this.emit('wallet.error', { error: error.message });
      this.showError('Network error: ' + error.message);
      return null;
    }
  }

  async addCard(cardNumber, expiry, cvv, pin) {
    if (!this.currentWallet) {
      this.showError('No wallet available. Please create a wallet first.');
      return null;
    }

    try {
      this.emit('card.adding', { cardNumber: this.maskCardNumber(cardNumber) });

      const response = await fetch(`${this.apiUrl}/api/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.currentWallet.token}`
        },
        body: JSON.stringify({
          card_number: cardNumber,
          expiry: expiry,
          cvv: cvv,
          pin: pin
        })
      });

      const result = await response.json();
      if (response.ok) {
        this.emit('card.added', result);
        this.showSuccess('Card added successfully!');
        return result;
      } else {
        this.emit('card.error', result);
        this.showError(result.error || 'Failed to add card');
        return null;
      }
    } catch (error) {
      this.emit('card.error', { error: error.message });
      this.showError('Network error: ' + error.message);
      return null;
    }
  }

  async getBalance(pin) {
    if (!this.currentWallet) {
      this.showError('No wallet available');
      return 0;
    }

    try {
      this.emit('balance.fetching', {});

      const response = await fetch(`${this.apiUrl}/api/wallets/balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.currentWallet.token}`
        },
        body: JSON.stringify({ pin: pin })
      });

      const result = await response.json();
      if (response.ok) {
        this.emit('balance.updated', result);
        return result.balance;
      } else {
        this.emit('balance.error', result);
        this.showError(result.error || 'Failed to get balance');
        return 0;
      }
    } catch (error) {
      this.emit('balance.error', { error: error.message });
      this.showError('Network error: ' + error.message);
      return 0;
    }
  }

  async getCards() {
    if (!this.currentWallet) {
      this.showError('No wallet available');
      return [];
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/cards`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.currentWallet.token}`
        }
      });

      const result = await response.json();
      if (response.ok) {
        this.emit('cards.loaded', result);
        return result.cards;
      } else {
        this.emit('cards.error', result);
        this.showError(result.error || 'Failed to get cards');
        return [];
      }
    } catch (error) {
      this.emit('cards.error', { error: error.message });
      this.showError('Network error: ' + error.message);
      return [];
    }
  }

  async sendPayment(amount, recipient, pin) {
    if (!this.currentWallet) {
      this.showError('No wallet available');
      return null;
    }

    try {
      this.emit('payment.sending', { amount, recipient });

      const response = await fetch(`${this.apiUrl}/api/transactions/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.currentWallet.token}`
        },
        body: JSON.stringify({
          amount: amount,
          recipient: recipient,
          pin: pin,
          payment_method: 'sling'
        })
      });

      const result = await response.json();
      if (response.ok) {
        this.emit('payment.sent', result);
        this.showSuccess(`Payment of $${amount} sent successfully!`);
        return result;
      } else {
        this.emit('payment.error', result);
        this.showError(result.error || 'Failed to send payment');
        return null;
      }
    } catch (error) {
      this.emit('payment.error', { error: error.message });
      this.showError('Network error: ' + error.message);
      return null;
    }
  }

  // Utility methods
  maskCardNumber(cardNumber) {
    if (!cardNumber || cardNumber.length < 4) return cardNumber;
    const last4 = cardNumber.slice(-4);
    const masked = '*'.repeat(cardNumber.length - 4);
    return masked + last4;
  }

  validateCardNumber(cardNumber) {
    // Basic Luhn algorithm implementation
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  showSuccess(message) {
    console.log('✅ Success:', message);
    this.emit('notification.success', { message });
  }

  showError(message) {
    console.error('❌ Error:', message);
    this.emit('notification.error', { message });
  }

  // UI Integration methods
  renderWalletUI(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="celora-wallet-ui">
        <div class="wallet-header">
          <h3>🏦 Celora Wallet</h3>
          <div class="wallet-status ${this.currentWallet ? 'active' : 'inactive'}">
            ${this.currentWallet ? '🟢 Active' : '🔴 Inactive'}
          </div>
        </div>
        
        <div class="wallet-actions">
          ${!this.currentWallet ? `
            <div class="create-wallet-section">
              <input type="email" id="wallet-owner" placeholder="Email address" />
              <input type="password" id="wallet-pin" placeholder="6-digit PIN" maxlength="6" />
              <button id="create-wallet-btn">Create Wallet</button>
            </div>
          ` : `
            <div class="wallet-info">
              <p>Owner: ${this.currentWallet.owner}</p>
              <div class="balance" id="wallet-balance">Loading...</div>
            </div>
            
            <div class="add-card-section">
              <h4>Add Virtual Card</h4>
              <input type="text" id="card-number" placeholder="Card Number" maxlength="19" />
              <input type="text" id="card-expiry" placeholder="MM/YY" maxlength="5" />
              <input type="text" id="card-cvv" placeholder="CVV" maxlength="4" />
              <input type="password" id="card-pin" placeholder="PIN" maxlength="6" />
              <button id="add-card-btn">Add Card</button>
            </div>
            
            <div class="cards-list" id="cards-list">
              <h4>Your Cards</h4>
              <div id="cards-container">Loading...</div>
            </div>
          `}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const createBtn = document.getElementById('create-wallet-btn');
    const addCardBtn = document.getElementById('add-card-btn');

    if (createBtn) {
      createBtn.addEventListener('click', async () => {
        const owner = document.getElementById('wallet-owner').value;
        const pin = document.getElementById('wallet-pin').value;
        
        if (owner && pin && pin.length === 6) {
          await this.createWallet(owner, pin);
          this.renderWalletUI('celora-wallet-container'); // Re-render
        } else {
          this.showError('Please enter valid email and 6-digit PIN');
        }
      });
    }

    if (addCardBtn) {
      addCardBtn.addEventListener('click', async () => {
        const cardNumber = document.getElementById('card-number').value;
        const expiry = document.getElementById('card-expiry').value;
        const cvv = document.getElementById('card-cvv').value;
        const pin = document.getElementById('card-pin').value;
        
        if (this.validateCardNumber(cardNumber) && expiry && cvv && pin) {
          await this.addCard(cardNumber, expiry, cvv, pin);
          this.loadCards(); // Refresh cards list
        } else {
          this.showError('Please enter valid card details');
        }
      });
    }
  }

  async loadCards() {
    const container = document.getElementById('cards-container');
    if (!container) return;

    const cards = await this.getCards();
    
    if (cards.length === 0) {
      container.innerHTML = '<p>No cards added yet</p>';
      return;
    }

    container.innerHTML = cards.map(card => `
      <div class="card-item">
        <div class="card-number">${card.card_number_masked}</div>
        <div class="card-expiry">Expires: ${card.expiry}</div>
        <div class="card-status">Status: ${card.status}</div>
      </div>
    `).join('');
  }
}

// Initialize wallet UI when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.celoraWallet = new CeloraWalletUI();
  
  // Auto-render if container exists
  if (document.getElementById('celora-wallet-container')) {
    window.celoraWallet.renderWalletUI('celora-wallet-container');
  }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CeloraWalletUI;
}
