import { useState } from 'react'
// Removed problematic imports for now - will add back when Supabase is configured

export default function Home() {
  const [activeTab, setActiveTab] = useState('dashboard')
  // Simulate auth state for now
  const isAuthenticated = false

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen bg-gray-900">
        <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            <div>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">
                🌊 Celora Wallet
              </h2>
              <p className="mt-2 text-sm text-gray-400">
                Modern crypto trading platform
              </p>
              <div className="mt-8 p-6 bg-gray-800/50 rounded-lg border border-teal-500/20">
                <p className="text-teal-400 text-sm mb-4">
                  🔧 Setup Required:
                </p>
                <ol className="text-sm text-gray-300 space-y-2">
                  <li>1. Sett opp Supabase credentials i .env.local</li>
                  <li>2. Restart serveren</li>
                  <li>3. Authentication vil være tilgjengelig</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Neural network background */}
      <div className="fixed inset-0 overflow-hidden">
        <div className="neural-bg">
          {/* Quantum particles would be generated here */}
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-gray-900/80 backdrop-blur-sm border-b border-teal-500/20 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-teal-400">
            🌊 Celora Wallet
          </h1>
          <div className="flex items-center space-x-4">
            <div className="bg-gray-800/50 rounded-lg px-3 py-1 text-sm border border-teal-500/20">
              <span className="text-teal-400">●</span> Ready for Setup
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="relative z-10 bg-gray-900/80 backdrop-blur-sm border-b border-teal-500/20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-6 whitespace-nowrap font-medium border-b-2 transition-all ${
                activeTab === 'dashboard'
                  ? 'text-teal-400 border-teal-500'
                  : 'text-gray-400 border-transparent hover:text-teal-400 hover:border-teal-500/50'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('send')}
              className={`py-4 px-6 whitespace-nowrap font-medium border-b-2 transition-all ${
                activeTab === 'send'
                  ? 'text-teal-400 border-teal-500'
                  : 'text-gray-400 border-transparent hover:text-teal-400 hover:border-teal-500/50'
              }`}
            >
              ⚡ Send
            </button>
            <button
              onClick={() => setActiveTab('receive')}
              className={`py-4 px-6 whitespace-nowrap font-medium border-b-2 transition-all ${
                activeTab === 'receive'
                  ? 'text-teal-400 border-teal-500'
                  : 'text-gray-400 border-transparent hover:text-teal-400 hover:border-teal-500/50'
              }`}
            >
              💎 Receive
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-6 whitespace-nowrap font-medium border-b-2 transition-all ${
                activeTab === 'settings'
                  ? 'text-teal-400 border-teal-500'
                  : 'text-gray-400 border-transparent hover:text-teal-400 hover:border-teal-500/50'
              }`}
            >
              ⚙️ Settings
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative z-10 p-4 max-w-6xl mx-auto w-full">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-teal-500/20 rounded-xl p-6 hover:scale-105 transition-transform">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-teal-400">Total Balance</h3>
                  <span className="text-2xl">💰</span>
                </div>
                <div className="text-3xl font-bold text-teal-400">$12,847.52</div>
                <div className="text-sm text-green-400 mt-2">+5.7% (24h)</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-teal-500/20 rounded-xl p-6 hover:scale-105 transition-transform">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-teal-400">SOL Balance</h3>
                  <span className="text-2xl">◎</span>
                </div>
                <div className="text-3xl font-bold text-purple-400">127.45 SOL</div>
                <div className="text-sm text-gray-400 mt-2">≈ $8,234.25</div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm border border-teal-500/20 rounded-xl p-6 hover:scale-105 transition-transform">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-teal-400">USDC Balance</h3>
                  <span className="text-2xl">💵</span>
                </div>
                <div className="text-3xl font-bold text-green-400">4,613.27 USDC</div>
                <div className="text-sm text-gray-400 mt-2">Stable coin</div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-teal-500/20 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-teal-400 mb-6 flex items-center">
                <span className="mr-3">📋</span>
                Recent Transactions
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg hover:bg-teal-500/5 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-green-400 text-lg">↗️</span>
                    </div>
                    <div>
                      <div className="font-semibold">Sent SOL</div>
                      <div className="text-sm text-gray-400">2 hours ago</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-red-400">-25.5 SOL</div>
                    <div className="text-sm text-gray-400">≈ $1,649.25</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'send' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-teal-500/20 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-teal-400 mb-6 flex items-center">
                <span className="mr-3">⚡</span>
                Send Cryptocurrency
              </h2>
              {/* Send form would go here */}
              <p className="text-gray-400">Send functionality connected to Supabase backend</p>
            </div>
          </div>
        )}

        {activeTab === 'receive' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-teal-500/20 rounded-xl p-8">
              <h2 className="text-2xl font-bold text-teal-400 mb-6 flex items-center">
                <span className="mr-3">💎</span>
                Receive Cryptocurrency
              </h2>
              {/* Receive interface would go here */}
              <p className="text-gray-400">Receive functionality with Supabase integration</p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-teal-500/20 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-teal-400 mb-4 flex items-center">
                <span className="mr-3">⚙️</span>
                Settings
              </h3>
              <p className="text-gray-400">Settings panel with Supabase user management</p>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        .neural-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: 
            radial-gradient(circle at 20% 30%, rgba(20, 184, 166, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(45, 212, 191, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 60% 20%, rgba(20, 184, 166, 0.05) 0%, transparent 50%);
        }
      `}</style>
    </div>
  )
}
