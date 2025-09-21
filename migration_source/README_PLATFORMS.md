# 🌊 Celora Wallet - Modern Crypto Trading Platform

## Overview
Celora Wallet er en moderne kryptovaluta wallet med quantum-inspirert design og glass morphism effekter. Prosjektet inkluderer:

- **Modern HTML Wallet**: Standalone HTML med quantum partikler og Celora branding
- **Supabase Platform**: Backend-as-a-service implementering
- **Moralis Platform**: Web3 og blockchain-fokusert implementering

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/stusseligmini/Celora-platform.git
cd Celora-platform
```

### 2. Modern HTML Wallet
Åpne `celora-wallet-modern.html` direkte i nettleser - ingen installasjon nødvendig!

### 3. Supabase Platform
```bash
cd celora-supabase
npm install
# Sett opp .env.local med Supabase credentials
npm run dev
```

### 4. Moralis Platform
```bash
cd celora-moralis  
npm install
# Sett opp .env.local med Moralis API keys
npm run dev
```

## 🎨 Features

### Modern Design
- ✨ Quantum particle effects
- 🌌 Neural network background  
- 🔮 Glass morphism design
- 🎯 Original Celora cyan/blue colors (#14b8a6, #2dd4bf)
- 📱 4 consolidated navigation tabs

### Platform Comparison

| Feature | HTML Wallet | Supabase | Moralis |
|---------|-------------|----------|---------|
| Authentication | None | ✅ Email/Social | ✅ Web3 Wallets |
| Database | None | ✅ PostgreSQL | ✅ MongoDB |
| Real-time | None | ✅ Subscriptions | ✅ Streams |
| Multi-chain | None | Limited | ✅ Full Support |
| Decentralized | None | Hybrid | ✅ Full Web3 |

## 📁 Project Structure

```
Celora_Project/
├── celora-wallet-modern.html    # Standalone modern wallet
├── celora-supabase/             # Traditional backend approach
│   ├── pages/                   # Next.js pages
│   ├── styles/                  # Tailwind CSS
│   └── DEPLOY.md               # Setup instructions
└── celora-moralis/              # Web3 blockchain approach
    ├── pages/                   # Next.js pages with Web3
    ├── styles/                  # Tailwind CSS
    └── DEPLOY.md               # Setup instructions
```

## 🛠 Tech Stack

### Core Technologies
- **Frontend**: Next.js 13.5, React 18.2, TypeScript 5.2
- **Styling**: Tailwind CSS 3.3, Glass Morphism
- **Animations**: Quantum particles, Neural backgrounds

### Supabase Stack
- **Database**: PostgreSQL with real-time subscriptions
- **Auth**: Email, Google, GitHub login
- **API**: Auto-generated REST/GraphQL

### Moralis Stack  
- **Web3**: Multi-chain wallet connections
- **Wallets**: RainbowKit integration
- **Blockchain**: Ethereum, Polygon, Arbitrum, Optimism

## 🔧 Environment Setup

### Supabase (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Moralis (.env.local)
```env
NEXT_PUBLIC_MORALIS_API_KEY=your_moralis_api_key
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
```

## 🎯 Testing Both Platforms

1. **Start begge servere:**
   ```bash
   # Terminal 1 - Supabase
   cd celora-supabase && npm run dev
   
   # Terminal 2 - Moralis  
   cd celora-moralis && npm run dev
   ```

2. **Test forskjellene:**
   - Supabase: http://localhost:3000 (traditional auth)
   - Moralis: http://localhost:3001 (Web3 wallet connection)

## 📊 Platform Recommendations

### Use Supabase when:
- Traditional user accounts needed
- Real-time database features required  
- Rapid prototyping and development
- Hybrid centralized/decentralized approach

### Use Moralis when:
- Full Web3 functionality required
- Multi-chain support needed
- NFT and DeFi integrations planned
- Completely decentralized architecture

## 🚀 Next Steps

1. Choose your preferred platform (Supabase vs Moralis)
2. Set up environment variables
3. Install dependencies with `npm install`  
4. Customize the design and functionality
5. Deploy to your preferred hosting platform

## 📝 License

MIT Open Source - feel free to modify and distribute!

---

**Built with ❤️ for the Celora community** 🌊
