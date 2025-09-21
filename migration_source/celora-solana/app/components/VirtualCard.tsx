'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Eye, EyeOff, Lock, Unlock, Settings, Plus, Trash2 } from 'lucide-react';

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

interface VirtualCardProps {
  card?: VirtualCardData;
  isNew?: boolean;
  onCreateCard?: (cardData: Partial<VirtualCardData>) => void;
  onUpdateCard?: (id: string, updates: Partial<VirtualCardData>) => void;
  onDeleteCard?: (id: string) => void;
}

export const VirtualCard: React.FC<VirtualCardProps> = ({
  card,
  isNew = false,
  onCreateCard,
  onUpdateCard,
  onDeleteCard
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(isNew);
  const [editForm, setEditForm] = useState({
    holderName: card?.holderName || '',
    spendingLimit: card?.spendingLimit || 1000,
    cardType: card?.cardType || 'debit' as 'debit' | 'credit'
  });

  const formatCardNumber = (number: string) => {
    if (!number) return '**** **** **** ****';
    if (!showDetails && !isNew) {
      return `**** **** **** ${number.slice(-4)}`;
    }
    return number.replace(/(.{4})/g, '$1 ').trim();
  };

  const handleToggleFreeze = () => {
    if (card && onUpdateCard) {
      onUpdateCard(card.id, { isFrozen: !card.isFrozen });
    }
  };

  const handleSaveCard = () => {
    if (isNew && onCreateCard) {
      onCreateCard({
        ...editForm,
        cardNumber: generateCardNumber(),
        expiryDate: generateExpiryDate(),
        cvv: generateCVV(),
        balance: 0,
        isActive: true,
        isFrozen: false
      });
    } else if (card && onUpdateCard) {
      onUpdateCard(card.id, editForm);
    }
    setIsEditing(false);
  };

  const generateCardNumber = () => {
    // Generate a fake card number for demo
    const prefix = '4532'; // Visa prefix
    const middle = Math.random().toString().slice(2, 10);
    const suffix = Math.random().toString().slice(2, 6);
    return prefix + middle + suffix;
  };

  const generateExpiryDate = () => {
    const now = new Date();
    const year = (now.getFullYear() + 3).toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${month}/${year}`;
  };

  const generateCVV = () => {
    return Math.floor(Math.random() * 900 + 100).toString();
  };

  if (isNew && isEditing) {
    return (
      <div className="w-full max-w-sm mx-auto">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
              <Plus className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h3 className="text-xl font-bold text-white text-center mb-6">Create New Card</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Cardholder Name
              </label>
              <input
                type="text"
                value={editForm.holderName}
                onChange={(e) => setEditForm(prev => ({ ...prev, holderName: e.target.value }))}
                placeholder="Your Full Name"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Card Type
              </label>
              <select
                value={editForm.cardType}
                onChange={(e) => setEditForm(prev => ({ ...prev, cardType: e.target.value as 'debit' | 'credit' }))}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="debit">Debit Card</option>
                <option value="credit">Credit Card</option>
              </select>
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Daily Spending Limit ($)
              </label>
              <input
                type="number"
                value={editForm.spendingLimit}
                onChange={(e) => setEditForm(prev => ({ ...prev, spendingLimit: Number(e.target.value) }))}
                placeholder="1000"
                min="100"
                max="10000"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          
          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCard}
              disabled={!editForm.holderName}
              className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-all"
            >
              Create Card
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!card) return null;

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="relative h-64 perspective-1000">
        <div 
          className={`relative w-full h-full transition-transform duration-700 transform-style-preserve-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front of Card */}
          <div className="absolute inset-0 w-full h-full backface-hidden">
            <div className="w-full h-full bg-gradient-to-br from-primary to-secondary rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-white/20"></div>
                <div className="absolute bottom-4 left-4 w-16 h-16 rounded-full bg-white/10"></div>
              </div>
              
              {/* Card Content */}
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium opacity-80">CELORA CARD</h3>
                    <p className="text-xs opacity-60">{card.cardType.toUpperCase()}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => setIsFlipped(true)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-2xl font-mono tracking-wider">
                      {formatCardNumber(card.cardNumber)}
                    </p>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs opacity-60">CARDHOLDER</p>
                      <p className="font-semibold">{card.holderName}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-60">EXPIRES</p>
                      <p className="font-semibold">{card.expiryDate}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Back of Card */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-6 text-white shadow-2xl">
              <div className="h-full flex flex-col justify-between">
                <div>
                  <div className="bg-black h-12 -mx-6 mb-6"></div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs opacity-60 mb-1">CVV</p>
                      <div className="bg-white text-black p-2 rounded text-right font-mono">
                        {showDetails ? card.cvv : '***'}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs opacity-60 mb-1">DAILY LIMIT</p>
                      <p className="text-lg font-semibold">${card.spendingLimit}</p>
                    </div>
                    
                    <div>
                      <p className="text-xs opacity-60 mb-1">BALANCE</p>
                      <p className="text-lg font-semibold">${card.balance.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsFlipped(false)}
                  className="w-full bg-white/20 hover:bg-white/30 py-2 rounded-xl transition-colors"
                >
                  Flip Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Card Controls */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${card.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-white font-medium">
              {card.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleFreeze}
              className={`p-2 rounded-lg transition-colors ${
                card.isFrozen ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
              }`}
            >
              {card.isFrozen ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 text-white" />
            </button>
            {onDeleteCard && (
              <button
                onClick={() => onDeleteCard(card.id)}
                className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            {card.isFrozen ? '🧊 Card is frozen' : '✅ Card is active'}
          </p>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && !isNew && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 max-w-md w-full border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6">Edit Card</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={editForm.holderName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, holderName: e.target.value }))}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Daily Spending Limit ($)
                </label>
                <input
                  type="number"
                  value={editForm.spendingLimit}
                  onChange={(e) => setEditForm(prev => ({ ...prev, spendingLimit: Number(e.target.value) }))}
                  min="100"
                  max="10000"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white py-3 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCard}
                className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white py-3 rounded-xl font-semibold transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// CSS for 3D flip animation (add to global CSS)
export const cardStyles = `
  .perspective-1000 { perspective: 1000px; }
  .transform-style-preserve-3d { transform-style: preserve-3d; }
  .backface-hidden { backface-visibility: hidden; }
  .rotate-y-180 { transform: rotateY(180deg); }
`;