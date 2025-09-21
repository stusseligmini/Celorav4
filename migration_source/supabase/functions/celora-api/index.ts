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

    // Health check
    if (path === '/health') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'celora-api'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Wallet endpoints
    if (path.startsWith('/api/wallet')) {
      if (path === '/api/wallet/connect') {
        return new Response(JSON.stringify({
          success: true,
          message: 'Wallet connection endpoint ready',
          supportedWallets: ['phantom', 'metamask', 'walletconnect', 'coinbase']
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      if (path === '/api/wallet/balance') {
        return new Response(JSON.stringify({
          solana: { balance: 0, symbol: 'SOL' },
          ethereum: { balance: 0, symbol: 'ETH' },
          message: 'Connect wallet to see real balance'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // User endpoints
    if (path.startsWith('/api/user')) {
      return new Response(JSON.stringify({
        message: 'User API endpoint',
        endpoints: ['/api/user/profile', '/api/user/wallets', '/api/user/transactions']
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Trading endpoints
    if (path.startsWith('/api/trading')) {
      return new Response(JSON.stringify({
        message: 'Trading API endpoint',
        endpoints: ['/api/trading/swap', '/api/trading/history', '/api/trading/pairs']
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Default API info
    return new Response(JSON.stringify({
      name: 'Celora API',
      version: '1.0.0',
      status: 'operational',
      endpoints: {
        health: '/health',
        wallet: '/api/wallet/*',
        user: '/api/user/*',
        trading: '/api/trading/*'
      },
      documentation: 'https://app.celora.net/docs'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
