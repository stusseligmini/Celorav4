'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ArrowLeft, Zap, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function StakePage() {
  const { publicKey } = useWallet();
  
  const [selectedValidator, setSelectedValidator] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake' | 'rewards'>('stake');

  // Mock data - replace with real validator and staking data
  const validators = [
    {
      id: 'val1',
      name: 'Celora Validator',
      commission: '5%',
      apy: '7.2%',
      uptime: '99.8%',
      staked: '2.5M SOL',
      status: 'active'
    },
    {
      id: 'val2', 
      name: 'Solana Beach',
      commission: '7%',
      apy: '6.8%',
      uptime: '99.5%',
      staked: '1.2M SOL',
      status: 'active'
    },
    {
      id: 'val3',
      name: 'Shinobi Systems',
      commission: '8%',
      apy: '6.5%',
      uptime: '99.9%',
      staked: '3.1M SOL',
      status: 'active'
    }
  ];

  const currentStakes = [
    {
      id: 'stake1',
      validator: 'Celora Validator',
      amount: 10.5,
      rewards: 0.2156,
      status: 'active',
      activationEpoch: 425,
      currentEpoch: 430
    },
    {
      id: 'stake2',
      validator: 'Solana Beach',
      amount: 5.0,
      rewards: 0.0892,
      status: 'activating',
      activationEpoch: 431,
      currentEpoch: 430
    }
  ];

  const totalStaked = currentStakes.reduce((sum, stake) => sum + stake.amount, 0);
  const totalRewards = currentStakes.reduce((sum, stake) => sum + stake.rewards, 0);
  const availableBalance = 5.234; // Mock balance

  const handleStake = async () => {
    if (!publicKey || !selectedValidator || !stakeAmount) return;
    
    setIsStaking(true);
    // Mock staking process
    setTimeout(() => {
      setIsStaking(false);
      alert('Staking transaction submitted!');
      setStakeAmount('');
      setSelectedValidator('');
    }, 2000);
  };

  const handleUnstake = async (id: string) => {
    if (!publicKey) return;
    
    setIsStaking(true);
    // Mock unstaking process
    setTimeout(() => {
      setIsStaking(false);
      alert(`Unstaking transaction submitted for stake ${id}!`);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-surface to-dark-card pt-20 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <Link href="/" className="mr-4 p-2 hover:bg-dark-card rounded-lg transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold">Staking</h1>
        </div>

        {!publicKey ? (
          <div className="bg-dark-card/50 backdrop-blur-sm rounded-2xl border border-dark-border p-8 text-center">
            <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-warning" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-dark-text-secondary mb-4">
              Please connect your wallet to start earning staking rewards.
            </p>
            <Link 
              href="/" 
              className="inline-block bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              Go Back Home
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-dark-card/50 backdrop-blur-sm rounded-xl border border-dark-border p-6">
                <div className="flex items-center mb-2">
                  <Zap className="w-5 h-5 text-primary-400 mr-2" />
                  <span className="text-sm text-dark-text-secondary">Total Staked</span>
                </div>
                <div className="text-2xl font-bold">{totalStaked.toFixed(4)} SOL</div>
                <div className="text-sm text-dark-text-secondary">
                  ~${(totalStaked * 98.45).toFixed(2)}
                </div>
              </div>

              <div className="bg-dark-card/50 backdrop-blur-sm rounded-xl border border-dark-border p-6">
                <div className="flex items-center mb-2">
                  <TrendingUp className="w-5 h-5 text-success mr-2" />
                  <span className="text-sm text-dark-text-secondary">Total Rewards</span>
                </div>
                <div className="text-2xl font-bold text-success">{totalRewards.toFixed(4)} SOL</div>
                <div className="text-sm text-dark-text-secondary">
                  ~${(totalRewards * 98.45).toFixed(2)}
                </div>
              </div>

              <div className="bg-dark-card/50 backdrop-blur-sm rounded-xl border border-dark-border p-6">
                <div className="flex items-center mb-2">
                  <Calendar className="w-5 h-5 text-accent-400 mr-2" />
                  <span className="text-sm text-dark-text-secondary">Est. APY</span>
                </div>
                <div className="text-2xl font-bold text-accent-400">7.2%</div>
                <div className="text-sm text-dark-text-secondary">
                  Annual percentage yield
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-dark-card/50 backdrop-blur-sm rounded-2xl border border-dark-border">
              <div className="flex border-b border-dark-border">
                {(['stake', 'unstake', 'rewards'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-6 py-4 font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? 'text-primary-400 border-b-2 border-primary-400'
                        : 'text-dark-text-secondary hover:text-dark-text'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Stake Tab */}
                {activeTab === 'stake' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-3">Available Balance</label>
                      <div className="bg-dark-surface/50 rounded-xl p-4 border border-dark-border/50">
                        <div className="text-lg font-semibold">{availableBalance} SOL</div>
                        <div className="text-sm text-dark-text-secondary">
                          ~${(availableBalance * 98.45).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-3">Select Validator</label>
                      <div className="space-y-3">
                        {validators.map((validator) => (
                          <button
                            key={validator.id}
                            onClick={() => setSelectedValidator(validator.id)}
                            className={`w-full p-4 rounded-xl border text-left transition-colors ${
                              selectedValidator === validator.id
                                ? 'border-primary-500 bg-primary-500/10'
                                : 'border-dark-border bg-dark-surface/50 hover:bg-dark-surface'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{validator.name}</div>
                                <div className="text-sm text-dark-text-secondary">
                                  {validator.staked} staked • {validator.uptime} uptime
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-success font-medium">{validator.apy} APY</div>
                                <div className="text-sm text-dark-text-secondary">
                                  {validator.commission} fee
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-3">Stake Amount</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-4 py-3 bg-dark-surface border border-dark-border rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors pr-20"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-text-secondary">
                          SOL
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-sm text-dark-text-secondary">
                          Minimum: 0.001 SOL
                        </div>
                        <button
                          onClick={() => setStakeAmount((availableBalance - 0.01).toString())}
                          className="text-sm text-primary-400 hover:text-primary-300 font-medium"
                        >
                          Max
                        </button>
                      </div>
                    </div>

                    <div className="bg-dark-surface/30 rounded-xl p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-dark-text-secondary">Est. Annual Rewards:</span>
                        <span>{stakeAmount ? (parseFloat(stakeAmount) * 0.072).toFixed(4) : '0.0000'} SOL</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-dark-text-secondary">Activation Time:</span>
                        <span>~1-2 epochs (2-4 days)</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-dark-text-secondary">Network Fee:</span>
                        <span>~0.000005 SOL</span>
                      </div>
                    </div>

                    <button
                      onClick={handleStake}
                      disabled={!selectedValidator || !stakeAmount || parseFloat(stakeAmount) > availableBalance || isStaking}
                      className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-dark-surface disabled:text-dark-text-secondary text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center"
                    >
                      {isStaking ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                      ) : (
                        <>
                          <Zap className="w-5 h-5 mr-2" />
                          Stake SOL
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Unstake Tab */}
                {activeTab === 'unstake' && (
                  <div className="space-y-4">
                    {currentStakes.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-dark-text-secondary mb-2">No active stakes</div>
                        <button
                          onClick={() => setActiveTab('stake')}
                          className="text-primary-400 hover:text-primary-300"
                        >
                          Start staking to earn rewards
                        </button>
                      </div>
                    ) : (
                      currentStakes.map((stake) => (
                        <div key={stake.id} className="bg-dark-surface/50 rounded-xl p-4 border border-dark-border/50">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="font-medium">{stake.validator}</div>
                              <div className="text-sm text-dark-text-secondary">
                                Staked: {stake.amount} SOL • Rewards: {stake.rewards} SOL
                              </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              stake.status === 'active' ? 'bg-success/10 text-success' :
                              stake.status === 'activating' ? 'bg-warning/10 text-warning' :
                              'bg-error/10 text-error'
                            }`}>
                              {stake.status}
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-dark-text-secondary">
                              {stake.status === 'activating' 
                                ? `Activating in epoch ${stake.activationEpoch}`
                                : 'Earning rewards'
                              }
                            </div>
                            <button
                              onClick={() => handleUnstake(stake.id)}
                              disabled={stake.status !== 'active' || isStaking}
                              className="bg-error/10 hover:bg-error/20 text-error px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                              Unstake
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Rewards Tab */}
                {activeTab === 'rewards' && (
                  <div className="space-y-4">
                    <div className="bg-success/10 border border-success/20 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-success">Available Rewards</div>
                          <div className="text-2xl font-bold">{totalRewards.toFixed(4)} SOL</div>
                        </div>
                        <button className="bg-success hover:bg-success/90 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                          Claim All
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {currentStakes.map((stake) => (
                        <div key={stake.id} className="bg-dark-surface/50 rounded-xl p-4 border border-dark-border/50">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{stake.validator}</div>
                              <div className="text-sm text-dark-text-secondary">
                                {stake.rewards.toFixed(4)} SOL earned
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-dark-text-secondary">~${(stake.rewards * 98.45).toFixed(2)}</div>
                              <div className="text-xs text-dark-text-secondary">
                                {((stake.rewards / stake.amount) * 100).toFixed(2)}% yield
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-primary-400 mr-3 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-primary-400 mb-1">Staking Information</div>
                  <ul className="space-y-1 text-dark-text-secondary">
                    <li>• Staking rewards are distributed every epoch (~2-3 days)</li>
                    <li>• Unstaking takes 2-3 epochs to complete (deactivation period)</li>
                    <li>• Choose validators with high uptime and competitive fees</li>
                    <li>• Your SOL remains in your control while staked</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
