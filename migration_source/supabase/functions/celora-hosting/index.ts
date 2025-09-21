import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname

        // Minimal inline assets so PWA references work when served by the Edge Function.
        if (path === '/manifest.json') {
            const manifest = {
                name: 'Celora',
                short_name: 'Celora',
                start_url: '/',
                display: 'standalone',
                background_color: '#0B1020',
                theme_color: '#10B981',
                icons: [
                    { src: 'https://www.celora.net/icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'https://www.celora.net/icon-512.png', sizes: '512x512', type: 'image/png' }
                ]
            }
            return new Response(JSON.stringify(manifest), {
                headers: { ...corsHeaders, 'content-type': 'application/manifest+json' },
            })
        }

        if (path === '/sw.js') {
            const sw = `self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { self.clients.claim(); });
self.addEventListener('fetch', () => {});`;
            return new Response(sw, {
                headers: { ...corsHeaders, 'content-type': 'application/javascript' },
            })
        }

    // Serve the main Celora platform HTML
    const html = `
    <!DOCTYPE html>
    <html lang="no">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Celora - Digital Asset Platform</title>
        <script src="https://cdn.tailwindcss.com"></script>
    <link rel="manifest" href="/manifest.json">
        <meta name="theme-color" content="#10B981">
        <style>
            .gradient-bg { background: linear-gradient(135deg, #10B981 0%, #059669 100%); }
            .crypto-glow { box-shadow: 0 0 30px rgba(16, 185, 129, 0.3); }
        </style>
    </head>
    <body class="bg-gray-900 text-white">
        <!-- Header -->
        <header class="gradient-bg shadow-lg">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center py-6">
                    <div class="flex items-center">
                        <h1 class="text-3xl font-bold text-white">🚀 Celora</h1>
                        <span class="ml-2 text-sm bg-white/20 px-2 py-1 rounded-full">LIVE</span>
                    </div>
                    <nav class="hidden md:flex space-x-8">
                        <a href="#features" class="text-white/90 hover:text-white">Features</a>
                        <a href="#wallets" class="text-white/90 hover:text-white">Wallets</a>
                        <a href="https://app.celora.net" class="bg-white text-green-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors">Launch App</a>
                    </nav>
                </div>
            </div>
        </header>

        <!-- Hero Section -->
        <section class="py-20 px-4 sm:px-6 lg:px-8">
            <div class="max-w-4xl mx-auto text-center">
                <h2 class="text-5xl md:text-6xl font-bold mb-6 gradient-bg bg-clip-text text-transparent">
                    Din Digitale Asset Platform
                </h2>
                <p class="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                    Koble sammen Solana og Ethereum wallets. Handle, swap og administrer dine crypto-eiendeler på én sikker plattform.
                </p>
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="https://app.celora.net" class="gradient-bg px-8 py-4 rounded-lg font-semibold text-xl crypto-glow hover:scale-105 transition-transform">
                        🚀 Start Trading
                    </a>
                    <a href="#features" class="border-2 border-green-500 px-8 py-4 rounded-lg font-semibold text-xl hover:bg-green-500/10 transition-colors">
                        📚 Learn More
                    </a>
                </div>
            </div>
        </section>

        <!-- Features Section -->
        <section id="features" class="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/50">
            <div class="max-w-6xl mx-auto">
                <h3 class="text-4xl font-bold text-center mb-16">🌟 Platform Features</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <!-- Multi-Chain Support -->
                    <div class="bg-gray-800 p-8 rounded-xl crypto-glow">
                        <div class="text-4xl mb-4">⛓️</div>
                        <h4 class="text-2xl font-bold mb-4 text-green-400">Multi-Chain</h4>
                        <p class="text-gray-300">Support for Solana and Ethereum networks. Seamless cross-chain transactions.</p>
                    </div>
                    
                    <!-- Wallet Integration -->
                    <div class="bg-gray-800 p-8 rounded-xl crypto-glow">
                        <div class="text-4xl mb-4">👛</div>
                        <h4 class="text-2xl font-bold mb-4 text-green-400">All Wallets</h4>
                        <p class="text-gray-300">Phantom, MetaMask, WalletConnect. Connect your favorite wallet instantly.</p>
                    </div>
                    
                    <!-- Mobile Ready -->
                    <div class="bg-gray-800 p-8 rounded-xl crypto-glow">
                        <div class="text-4xl mb-4">📱</div>
                        <h4 class="text-2xl font-bold mb-4 text-green-400">Mobile PWA</h4>
                        <p class="text-gray-300">Install as mobile app. Works offline. Native app experience.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- Wallets Section -->
        <section id="wallets" class="py-20 px-4 sm:px-6 lg:px-8">
            <div class="max-w-4xl mx-auto text-center">
                <h3 class="text-4xl font-bold mb-16">🔐 Supported Wallets</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div class="bg-gray-800 p-6 rounded-xl hover:bg-gray-700 transition-colors">
                        <div class="text-3xl mb-2">👻</div>
                        <div class="font-semibold">Phantom</div>
                        <div class="text-sm text-gray-400">Solana</div>
                    </div>
                    <div class="bg-gray-800 p-6 rounded-xl hover:bg-gray-700 transition-colors">
                        <div class="text-3xl mb-2">🦊</div>
                        <div class="font-semibold">MetaMask</div>
                        <div class="text-sm text-gray-400">Ethereum</div>
                    </div>
                    <div class="bg-gray-800 p-6 rounded-xl hover:bg-gray-700 transition-colors">
                        <div class="text-3xl mb-2">🔗</div>
                        <div class="font-semibold">WalletConnect</div>
                        <div class="text-sm text-gray-400">Multi-Chain</div>
                    </div>
                    <div class="bg-gray-800 p-6 rounded-xl hover:bg-gray-700 transition-colors">
                        <div class="text-3xl mb-2">🏦</div>
                        <div class="font-semibold">Coinbase</div>
                        <div class="text-sm text-gray-400">Ethereum</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- CTA Section -->
        <section class="py-20 px-4 sm:px-6 lg:px-8 gradient-bg">
            <div class="max-w-4xl mx-auto text-center">
                <h3 class="text-4xl font-bold mb-6">Ready to Start?</h3>
                <p class="text-xl mb-8 text-white/90">Join thousands of users managing their digital assets with Celora</p>
                <a href="https://app.celora.net" class="bg-white text-green-600 px-10 py-4 rounded-lg font-bold text-xl hover:bg-gray-100 transition-colors crypto-glow">
                    🚀 Launch Celora App
                </a>
            </div>
        </section>

        <!-- Footer -->
        <footer class="bg-gray-900 border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-6xl mx-auto">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div>
                        <h4 class="text-2xl font-bold mb-4 gradient-bg bg-clip-text text-transparent">Celora</h4>
                        <p class="text-gray-400">The future of digital asset management</p>
                    </div>
                    <div>
                        <h5 class="font-bold mb-4">Platform</h5>
                        <div class="space-y-2">
                            <a href="https://app.celora.net" class="block text-gray-400 hover:text-green-400">Web App</a>
                            <a href="https://api.celora.net" class="block text-gray-400 hover:text-green-400">API Docs</a>
                        </div>
                    </div>
                    <div>
                        <h5 class="font-bold mb-4">Support</h5>
                        <div class="space-y-2">
                            <a href="mailto:support@celora.net" class="block text-gray-400 hover:text-green-400">Contact</a>
                            <a href="https://github.com/stusseligmini/Celora-platform" class="block text-gray-400 hover:text-green-400">GitHub</a>
                        </div>
                    </div>
                    <div>
                        <h5 class="font-bold mb-4">Status</h5>
                        <div class="flex items-center space-x-2">
                            <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span class="text-green-400 text-sm">All Systems Operational</span>
                        </div>
                    </div>
                </div>
                <div class="mt-12 pt-8 border-t border-gray-800 text-center text-gray-400">
                    <p>&copy; 2025 Celora. Built with Supabase Edge Functions.</p>
                </div>
            </div>
        </footer>

        <!-- PWA Install Prompt -->
        <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
        }
        
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });
        </script>
    </body>
    </html>
    `

    return new Response(html, {
      headers: { 
        ...corsHeaders, 
        'content-type': 'text/html; charset=UTF-8',
        'cache-control': 'public, max-age=3600'
      },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
