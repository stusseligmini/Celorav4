'use client';

import React, { useState, useEffect } from 'react';

interface CryptoWallet {
  id: string;
  type: 'solana' | 'ethereum' | 'bitcoin';
  address: string;
  balance: number;
  isActive: boolean;
}

interface VirtualCard {
  id: string;
  maskedPan: string;
  balance: number;
  status: string;
}

interface WalletData {
  wallets: CryptoWallet[];
  cards: VirtualCard[];
}

interface CeloraWalletPanelProps {
  userId: string;
}

export const CeloraWalletPanel: React.FC<CeloraWalletPanelProps> = ({ userId }) => {
  const [walletData, setWalletData] = useState<WalletData>({ wallets: [], cards: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'crypto' | 'cards'>('crypto');
  const [showCreateWallet, setShowCreateWallet] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);

  // Wallet creation form state
  const [walletForm, setWalletForm] = useState({
    type: 'solana' as 'solana' | 'ethereum' | 'bitcoin',
    address: '',
    privateKey: '',
    pin: ''
  });

  // Card creation form state
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    pin: ''
  });

  // PIN verification state
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [pin, setPin] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardDetails, setCardDetails] = useState<any>(null);

  useEffect(() => {
    loadWalletData();
  }, [userId]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/wallet?userId=${userId}`);
      const result = await response.json();
      
      if (result.success) {
        setWalletData(result.data);
      } else {
        setError(result.error || 'Failed to load wallet data');
      }
    } catch (err) {
      setError('Network error loading wallet data');
    } finally {
      setLoading(false);
    }
  };

  const createWallet = async () => {
    try {
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...walletForm })
      });

      const result = await response.json();
      if (result.success) {
        setShowCreateWallet(false);
        setWalletForm({ type: 'solana', address: '', privateKey: '', pin: '' });
        loadWalletData();
        alert('Crypto wallet created successfully!');
      } else {
        alert(result.error || 'Failed to create wallet');
      }
    } catch (err) {
      alert('Network error creating wallet');
    }
  };

  const addVirtualCard = async () => {
    try {
      const response = await fetch('/api/wallet/card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...cardForm })
      });

      const result = await response.json();
      if (result.success) {
        setShowAddCard(false);
        setCardForm({ cardNumber: '', expiry: '', cvv: '', pin: '' });
        loadWalletData();
        alert('Virtual card added successfully!');
      } else {
        alert(result.error || 'Failed to add card');
      }
    } catch (err) {
      alert('Network error adding card');
    }
  };

  const viewCardDetails = async (cardId: string) => {
    if (!pin) {
      setSelectedCardId(cardId);
      setShowPinVerification(true);
      return;
    }

    try {
      const response = await fetch(`/api/wallet/card/${cardId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pin })
      });

      const result = await response.json();
      if (result.success) {
        setCardDetails(result.cardData);
        setShowPinVerification(false);
        setPin('');
      } else {
        alert(result.error || 'Failed to get card details');
      }
    } catch (err) {
      alert('Network error getting card details');
    }
  };

  const verifyPin = async () => {
    if (selectedCardId) {
      await viewCardDetails(selectedCardId);
    }
  };

  const maskAddress = (address: string) => {
    if (address.length <= 8) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getWalletIcon = (type: string) => {
    const icons: Record<string, string> = {
      solana: '◎',
      ethereum: 'Ξ',
      bitcoin: '₿'
    };
    return icons[type] || '?';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading wallet data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button 
          onClick={loadWalletData}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Celora Wallet</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('crypto')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'crypto' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Crypto Wallets ({walletData.wallets.length})
          </button>
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-4 py-2 rounded-lg ${activeTab === 'cards' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Virtual Cards ({walletData.cards.length})
          </button>
        </div>
      </div>

      {/* Crypto Wallets Tab */}
      {activeTab === 'crypto' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Crypto Wallets</h3>
            <button
              onClick={() => setShowCreateWallet(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              + Create Wallet
            </button>
          </div>

          {walletData.wallets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No crypto wallets found. Create your first wallet to get started.
            </div>
          ) : (
            <div className="grid gap-4">
              {walletData.wallets.map((wallet) => (
                <div key={wallet.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getWalletIcon(wallet.type)}</span>
                      <div>
                        <h4 className="font-semibold capitalize">{wallet.type} Wallet</h4>
                        <p className="text-sm text-gray-600">{maskAddress(wallet.address)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{wallet.balance.toFixed(8)}</p>
                      <p className="text-sm text-gray-600">{wallet.type.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <span className={`px-2 py-1 rounded text-xs ${wallet.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'}`}>
                      {wallet.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <div className="space-x-2">
                      <button className="text-blue-600 hover:text-blue-800 text-sm">Send</button>
                      <button className="text-blue-600 hover:text-blue-800 text-sm">Receive</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Virtual Cards Tab */}
      {activeTab === 'cards' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Virtual Cards</h3>
            <button
              onClick={() => setShowAddCard(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              + Add Card
            </button>
          </div>

          {walletData.cards.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No virtual cards found. Add your first card to get started.
            </div>
          ) : (
            <div className="grid gap-4">
              {walletData.cards.map((card) => (
                <div key={card.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">💳</span>
                      <div>
                        <h4 className="font-semibold">{card.maskedPan}</h4>
                        <p className="text-sm text-gray-600">Virtual Card</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">${card.balance.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">USD</p>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <span className={`px-2 py-1 rounded text-xs ${card.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'}`}>
                      {card.status}
                    </span>
                    <div className="space-x-2">
                      <button 
                        onClick={() => viewCardDetails(card.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Details
                      </button>
                      <button className="text-blue-600 hover:text-blue-800 text-sm">Top Up</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Wallet Modal */}
      {showCreateWallet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Crypto Wallet</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Wallet Type</label>
                <select
                  value={walletForm.type}
                  onChange={(e) => setWalletForm({ ...walletForm, type: e.target.value as any })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="solana">Solana</option>
                  <option value="ethereum">Ethereum</option>
                  <option value="bitcoin">Bitcoin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Wallet Address</label>
                <input
                  type="text"
                  value={walletForm.address}
                  onChange={(e) => setWalletForm({ ...walletForm, address: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Enter wallet address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Private Key</label>
                  <input
                    type="password"
                    autoComplete="current-password"
                  value={walletForm.privateKey}
                  onChange={(e) => setWalletForm({ ...walletForm, privateKey: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Enter private key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">PIN (4-6 digits)</label>
                  <input
                    type="password"
                    autoComplete="current-password"
                  value={walletForm.pin}
                  onChange={(e) => setWalletForm({ ...walletForm, pin: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Enter PIN"
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-6">
              <button
                onClick={() => setShowCreateWallet(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={createWallet}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Card Modal */}
      {showAddCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Virtual Card</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Card Number</label>
                <input
                  type="text"
                  value={cardForm.cardNumber}
                  onChange={(e) => setCardForm({ ...cardForm, cardNumber: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="1234 5678 9012 3456"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Expiry</label>
                  <input
                    type="text"
                    value={cardForm.expiry}
                    onChange={(e) => setCardForm({ ...cardForm, expiry: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="MM/YY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">CVV</label>
                  <input
                    type="text"
                    value={cardForm.cvv}
                    onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="123"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">PIN (4-6 digits)</label>
                  <input
                    type="password"
                    autoComplete="new-password"
                  value={cardForm.pin}
                  onChange={(e) => setCardForm({ ...cardForm, pin: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Enter PIN"
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-6">
              <button
                onClick={() => setShowAddCard(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={addVirtualCard}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Verification Modal */}
      {showPinVerification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Enter PIN</h3>
            <p className="text-gray-600 mb-4">Please enter your PIN to view card details.</p>
              <input
                type="password"
                autoComplete="current-password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
              placeholder="Enter PIN"
              onKeyPress={(e) => e.key === 'Enter' && verifyPin()}
            />
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setShowPinVerification(false);
                  setPin('');
                  setSelectedCardId(null);
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={verifyPin}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Details Modal */}
      {cardDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Card Details</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600">Card Number</label>
                <p className="font-mono bg-gray-100 p-2 rounded">{cardDetails.cardNumber}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Expiry</label>
                  <p className="font-mono bg-gray-100 p-2 rounded">{cardDetails.expiry}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">CVV</label>
                  <p className="font-mono bg-gray-100 p-2 rounded">{cardDetails.cvv}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setCardDetails(null)}
              className="w-full mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CeloraWalletPanel;
