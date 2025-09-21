'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '../providers/SupabaseProvider';
import { SupabaseService } from '@celora/infrastructure/client';
import CeloraWalletPanel from './CeloraWalletPanel';

interface VirtualCard {
  id: string;
  masked_pan: string;
  balance: number;
  currency: string;
  status: 'active' | 'suspended' | 'closed';
}

interface RiskData {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface CardActionState {
  [cardId: string]: {
    isUpdating: boolean;
    isLoadingRisk: boolean;
    riskData?: RiskData;
  };
}

export function VirtualCardOverview() {
  const { user } = useSupabase();
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [supabaseService, setSupabaseService] = useState<SupabaseService | null>(null);
  const [cardStates, setCardStates] = useState<CardActionState>({});

  useEffect(() => {
    // Initialize SupabaseService with Next.js env vars
    const service = new SupabaseService(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    setSupabaseService(service);
  }, []);

  useEffect(() => {
    async function loadCards() {
      if (!user || !supabaseService) {
        setLoading(false);
        return;
      }

      try {
        const userCards = await supabaseService.getVirtualCards(user.id);
        setCards(userCards);
        
        // Initialize card states
        const initialStates: CardActionState = {};
        userCards.forEach(card => {
          initialStates[card.id] = {
            isUpdating: false,
            isLoadingRisk: false
          };
        });
        setCardStates(initialStates);
        
        // Load risk scores in background
        userCards.forEach(card => loadRiskScore(card.id));
      } catch (error) {
        console.error('Failed to load cards:', error);
      } finally {
        setLoading(false);
      }
    }

    loadCards();
  }, [user, supabaseService]);

  // Real-time subscription
  useEffect(() => {
    if (!user || !supabaseService) return;
    const channel = supabaseService.subscribeToCardUpdates(user.id, async () => {
      // Re-fetch cards on any change
      const updated = await supabaseService.getVirtualCards(user.id);
      setCards(updated);
    });
    return () => { channel.unsubscribe?.(); };
  }, [user, supabaseService]);

  const loadRiskScore = async (cardId: string) => {
    setCardStates(prev => ({
      ...prev,
      [cardId]: { ...prev[cardId], isLoadingRisk: true }
    }));

    try {
      const response = await fetch(`/api/cards/${cardId}/risk`);
      if (response.ok) {
        const riskData = await response.json();
        setCardStates(prev => ({
          ...prev,
          [cardId]: { 
            ...prev[cardId], 
            isLoadingRisk: false, 
            riskData: {
              riskScore: riskData.riskScore,
              riskLevel: riskData.riskLevel
            }
          }
        }));
      }
    } catch (error) {
      console.error('Failed to load risk score:', error);
      setCardStates(prev => ({
        ...prev,
        [cardId]: { ...prev[cardId], isLoadingRisk: false }
      }));
    }
  };

  const toggleCardStatus = async (card: VirtualCard) => {
    const newStatus = card.status === 'active' ? 'suspended' : 'active';
    
    // Optimistic update
    setCards(prev => prev.map(c => 
      c.id === card.id ? { ...c, status: newStatus } : c
    ));
    
    setCardStates(prev => ({
      ...prev,
      [card.id]: { ...prev[card.id], isUpdating: true }
    }));

    try {
      const response = await fetch(`/api/cards/${card.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        // Revert optimistic update on error
        setCards(prev => prev.map(c => 
          c.id === card.id ? { ...c, status: card.status } : c
        ));
        console.error('Failed to update card status');
      }
    } catch (error) {
      // Revert optimistic update on error
      setCards(prev => prev.map(c => 
        c.id === card.id ? { ...c, status: card.status } : c
      ));
      console.error('Error updating card status:', error);
    } finally {
      setCardStates(prev => ({
        ...prev,
        [card.id]: { ...prev[card.id], isUpdating: false }
      }));
    }
  };

  const getRiskBadge = (cardId: string) => {
    const state = cardStates[cardId];
    if (!state) return null;
    
    if (state.isLoadingRisk) {
      return (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">Checking risk...</span>
        </div>
      );
    }
    
    if (!state.riskData) return null;
    
    const { riskLevel, riskScore } = state.riskData;
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-red-100 text-red-800 border-red-200'
    };
    
    return (
      <div 
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colors[riskLevel]}`}
        title={`Risk Score: ${(riskScore * 100).toFixed(0)}%`}
      >
        <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
          riskLevel === 'low' ? 'bg-green-500' : 
          riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
        }`}></div>
        {riskLevel.toUpperCase()} RISK
      </div>
    );
  };

  const handleCreateCard = async () => {
    if (!user || !supabaseService) return;

    try {
      const newCard = await supabaseService.createVirtualCard(user.id, {
        masked_pan: `**** **** **** ${Math.random().toString().slice(-4)}`,
        balance: 0,
        currency: 'USD'
      });

      if (newCard) {
        setCards(prev => [newCard, ...prev]);
      }
    } catch (error) {
      console.error('Failed to create card:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Virtual Cards</h2>
        <p className="text-gray-600">Please sign in to view your virtual cards.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Virtual Cards</h2>
        <button
          onClick={handleCreateCard}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Add Card
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">💳</div>
          <p className="text-gray-600 mb-4">No virtual cards yet</p>
          <button
            onClick={handleCreateCard}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Create Your First Card
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => {
            const cardState = cardStates[card.id] || { isUpdating: false, isLoadingRisk: false };
            
            return (
              <div
                key={card.id}
                className={`border rounded-lg p-4 transition-all duration-200 ${
                  card.status === 'active'
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : card.status === 'suspended'
                    ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                    : 'bg-gray-100 border-gray-300'
                } ${cardState.isUpdating ? 'opacity-75 animate-pulse' : ''}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className={`text-sm ${card.status === 'active' ? 'opacity-90' : card.status === 'suspended' ? 'opacity-80' : 'text-gray-600'}`}>
                        Virtual Card
                      </p>
                      {getRiskBadge(card.id)}
                    </div>
                    <p className={`text-lg font-mono ${card.status === 'active' ? '' : card.status === 'suspended' ? 'opacity-90' : 'text-gray-500'}`}>
                      {card.masked_pan}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm ${card.status === 'active' ? 'opacity-90' : card.status === 'suspended' ? 'opacity-80' : 'text-gray-600'}`}>
                      Balance
                    </p>
                    <p className={`text-xl font-semibold ${card.status === 'active' ? '' : card.status === 'suspended' ? 'opacity-90' : 'text-gray-700'}`}>
                      {card.currency} {card.balance.toFixed(2)}
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-between items-end">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className={`text-xs ${card.status === 'active' ? 'opacity-75' : card.status === 'suspended' ? 'opacity-70' : 'text-gray-500'}`}>
                        ID: {card.id.slice(-8)}
                      </p>
                    </div>
                    
                    {/* Action Buttons */}
                    {card.status !== 'closed' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => toggleCardStatus(card)}
                          disabled={cardState.isUpdating}
                          className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                            card.status === 'active'
                              ? 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                              : 'bg-white/20 hover:bg-white/30 text-white border border-white/30'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          aria-label={card.status === 'active' ? 'Freeze card' : 'Unfreeze card'}
                        >
                          {cardState.isUpdating ? (
                            <div className="flex items-center space-x-1">
                              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                              <span>Updating...</span>
                            </div>
                          ) : (
                            <>
                              {card.status === 'active' ? '❄️ Freeze' : '🔓 Unfreeze'}
                            </>
                          )}
                        </button>
                        
                        {card.status === 'active' && (
                          <button
                            onClick={async () => {
                              const raw = prompt('Enter amount to add (e.g. 50)');
                              if (!raw) return;
                              const amt = Number(raw);
                              if (isNaN(amt) || amt <= 0) {
                                alert('Invalid amount');
                                return;
                              }
                              try {
                                const res = await fetch(`/api/cards/${card.id}/fund`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ amount: amt })
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  setCards(prev => prev.map(c => c.id === card.id ? { ...c, balance: data.newBalance } : c));
                                } else {
                                  const err = await res.json();
                                  alert('Funding failed: ' + (err.error || 'Unknown error'));
                                }
                              } catch (e: any) {
                                console.error(e);
                                alert('Funding error');
                              }
                            }}
                            className="px-3 py-1 text-xs rounded-md font-medium bg-white/20 hover:bg-white/30 text-white border border-white/30 transition-colors"
                            aria-label="Add funds to card"
                          >
                            💰 Add Funds
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <p className={`text-sm capitalize font-medium ${
                      card.status === 'active' ? 'text-green-200' : 
                      card.status === 'suspended' ? 'text-yellow-200' : 'text-red-600'
                    }`}>
                      {card.status === 'active' ? '✅ Active' : card.status === 'suspended' ? '⏸️ Suspended' : '🚫 Closed'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Integrated Wallet Panel */}
      {user && (
        <div className="mt-8">
          <CeloraWalletPanel userId={user.id} />
        </div>
      )}
    </div>
  );
}