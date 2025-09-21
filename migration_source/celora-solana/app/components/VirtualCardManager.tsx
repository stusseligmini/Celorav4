'use client';

import { useState, useEffect } from 'react';
import { VirtualCard } from './VirtualCard';
import { VirtualCardService, VirtualCardRecord } from '../lib/virtualCardService';
import { Plus, CreditCard, Wallet } from 'lucide-react';

interface VirtualCardData {
  id: string;
  cardNumber: string;
  holderName: string;
  expiryDate: string;
  cvv: string;
  balance: number;
  isActive: boolean;
  isFrozen: boolean;
  spendingLimit: number;
  cardType: 'debit' | 'credit';
}

export const VirtualCardManager = () => {
  const [cards, setCards] = useState<VirtualCardData[]>([]);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [cardService, setCardService] = useState<VirtualCardService | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock user data - in real app this would come from wallet context
  const userId = 'demo-user-123';
  const masterPassword = 'demo-password-123';

  useEffect(() => {
    // Initialize card service
    const service = new VirtualCardService(masterPassword);
    setCardService(service);
    loadCards(service);
  }, []);

  const loadCards = async (service: VirtualCardService) => {
    setIsLoading(true);
    try {
      const cardRecords = await service.getUserCards(userId);
      
      // Convert database records to UI format
      const cardData: VirtualCardData[] = [];
      
      for (const record of cardRecords) {
        try {
          const details = await service.getCardDetails(record.id);
          if (details) {
            cardData.push({
              id: details.id,
              cardNumber: details.cardNumber,
              holderName: details.holder_name,
              expiryDate: details.expiryDate,
              cvv: details.cvv,
              balance: details.balance,
              isActive: details.is_active,
              isFrozen: details.is_frozen,
              spendingLimit: details.spending_limit,
              cardType: details.card_type
            });
          }
        } catch (error) {
          console.error('Failed to load card details:', error);
        }
      }
      
      setCards(cardData);
    } catch (error) {
      console.error('Failed to load cards:', error);
      // Fallback to demo card
      setCards([
        {
          id: '1',
          cardNumber: '4532123456789012',
          holderName: 'CELORA USER',
          expiryDate: '12/27',
          cvv: '123',
          balance: 2450.50,
          isActive: true,
          isFrozen: false,
          spendingLimit: 2000,
          cardType: 'debit'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCard = async (cardData: Partial<VirtualCardData>) => {
    if (!cardService) return;

    try {
      const newCard = await cardService.createVirtualCard(
        userId,
        cardData.holderName || 'CELORA USER',
        cardData.cardType || 'debit',
        cardData.spendingLimit || 1000
      );

      if (newCard) {
        // Reload cards to get the new one
        await loadCards(cardService);
        setShowCreateCard(false);
      }
    } catch (error) {
      console.error('Failed to create card:', error);
      // Fallback to local state update
      const newCardLocal: VirtualCardData = {
        id: Date.now().toString(),
        cardNumber: cardData.cardNumber || '',
        holderName: cardData.holderName || '',
        expiryDate: cardData.expiryDate || '',
        cvv: cardData.cvv || '',
        balance: cardData.balance || 0,
        isActive: cardData.isActive || true,
        isFrozen: cardData.isFrozen || false,
        spendingLimit: cardData.spendingLimit || 1000,
        cardType: cardData.cardType || 'debit'
      };
      
      setCards(prev => [...prev, newCardLocal]);
      setShowCreateCard(false);
    }
  };

  const handleUpdateCard = async (id: string, updates: Partial<VirtualCardData>) => {
    if (!cardService) return;

    try {
      const success = await cardService.updateCard(id, {
        holder_name: updates.holderName,
        spending_limit: updates.spendingLimit,
        is_active: updates.isActive,
        is_frozen: updates.isFrozen
      });

      if (success) {
        // Update local state
        setCards(prev => prev.map(card => 
          card.id === id ? { ...card, ...updates } : card
        ));
      }
    } catch (error) {
      console.error('Failed to update card:', error);
      // Fallback to local state update
      setCards(prev => prev.map(card => 
        card.id === id ? { ...card, ...updates } : card
      ));
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!cardService) return;

    try {
      const success = await cardService.deleteCard(id);
      
      if (success) {
        setCards(prev => prev.filter(card => card.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete card:', error);
      // Fallback to local state update
      setCards(prev => prev.filter(card => card.id !== id));
    }
  };

  const totalBalance = cards.reduce((sum, card) => sum + card.balance, 0);
  const activeCards = cards.filter(card => card.isActive).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 p-4 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 text-center border border-white/20">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4 animate-spin">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Loading Virtual Cards</h2>
          <p className="text-gray-400">Fetching your payment cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 mb-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Virtual Cards</h1>
              <p className="text-gray-300">Manage your crypto-powered payment cards</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">Total Balance</p>
                <p className="text-2xl font-bold text-white">${totalBalance.toFixed(2)}</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-white">{cards.length}</div>
              <div className="text-sm text-gray-400">Total Cards</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{activeCards}</div>
              <div className="text-sm text-gray-400">Active Cards</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{cards.filter(c => c.isFrozen).length}</div>
              <div className="text-sm text-gray-400">Frozen Cards</div>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {cards.map((card) => (
            <VirtualCard
              key={card.id}
              card={card}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteCard}
            />
          ))}
          
          {/* Add New Card Button */}
          <div className="w-full max-w-sm mx-auto">
            <div 
              onClick={() => setShowCreateCard(true)}
              className="h-64 bg-white/5 border-2 border-dashed border-white/20 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 hover:border-white/30 transition-all group"
            >
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Add New Card</h3>
              <p className="text-gray-400 text-center px-4">Create a new virtual payment card</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2">
              <Wallet className="w-5 h-5" />
              <span>Fund Card</span>
            </button>
            <button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Transfer Funds</span>
            </button>
            <button className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2">
              <span>💳</span>
              <span>Card Settings</span>
            </button>
            <button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center space-x-2">
              <span>📊</span>
              <span>Usage Report</span>
            </button>
          </div>
        </div>

        {/* Create Card Modal */}
        {showCreateCard && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-md">
              <VirtualCard
                isNew={true}
                onCreateCard={handleCreateCard}
              />
              <div className="text-center mt-4">
                <button
                  onClick={() => setShowCreateCard(false)}
                  className="bg-white/20 hover:bg-white/30 text-white py-2 px-6 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};