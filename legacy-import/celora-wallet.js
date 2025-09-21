
// Celora Wallet Frontend Integration
class CeloraWalletUI {
  constructor(apiBaseUrl = 'https://celora-backend.onrender.com') {
    this.apiUrl = apiBaseUrl;
    this.currentWallet = null;
    this.isLocked = false;
  }

  async createWallet(owner, pin) {
    try {
      const response = await fetch(`${this.apiUrl}/api/wallets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          owner: owner,
          pin: pin,
          wallet_type: 'secure_encrypted'
        })
      });
      
      const result = await response.json();
      if (response.ok) {
        this.currentWallet = result;
        this.showSuccess('Wallet created successfully!');
        return result;
      } else {
        this.showError(result.error || 'Failed to create wallet');
        return null;
      }
    } catch (error) {
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
        this.showSuccess('Card added successfully!');
        return result;
      } else {
        this.showError(result.error || 'Failed to add card');
        return null;
      }
    } catch (error) {
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
        return result.balance;
      } else {
        this.showError(result.error || 'Failed to get balance');
        return 0;
      }
    } catch (error) {
      this.showError('Network error: ' + error.message);
      return 0;
    }
  }

  showSuccess(message) {
    console.log('Success:', message);
    // Integrate with your UI notification system
  }

  showError(message) {
    console.error('Error:', message);
    // Integrate with your UI notification system
  }
}

// Initialize wallet UI
window.celoraWallet = new CeloraWalletUI();
