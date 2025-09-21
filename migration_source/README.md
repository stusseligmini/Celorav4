# 🚀 Celora Platform

Advanced cryptocurrency wallet and DeFi banking platform built with Next.js and Node.js.

## 🏗️ Project Structure

```
celora-platform/
├── celora-wallet/          # Next.js Frontend (React + TypeScript)
│   ├── src/app/           # Next.js App Router pages
│   ├── src/components/    # Reusable React components
│   └── src/providers/     # Web3 wallet providers
├── celora-backend/        # Node.js Backend (Express + TypeScript)
│   ├── src/routes/        # API routes
│   ├── src/services/      # Business logic
│   ├── src/middleware/    # Express middleware
│   └── prisma/           # Database schema & migrations
└── celora-solana/         # Solana program (Rust)
```

## ✨ Features

### 🎯 Frontend (celora-wallet)
- **Multi-chain wallet support** (Solana, Ethereum)
- **Beautiful UI/UX** with dark theme and gradients
- **Responsive design** for desktop and mobile
- **Real-time updates** via WebSocket
- **Send/Receive/Swap/Stake** functionality
- **Transaction history** with filtering
- **Portfolio overview** with balance tracking

### ⚡ Backend (celora-backend)
- **Advanced authentication** (JWT + Email verification)
- **Rate limiting & security** (Helmet, CORS, Brute force protection)
- **Real-time WebSocket** updates
- **PostgreSQL database** with Prisma ORM
- **Comprehensive API** for all wallet operations
- **Email integration** (SendGrid)
- **Error tracking** (Sentry ready)
- **Health monitoring** & metrics

### 🔗 Blockchain Integration
- **Solana Web3.js** for Solana blockchain
- **Ethers.js** for Ethereum blockchain
- **Real transaction execution**
- **Multi-wallet support** (Phantom, Solflare, etc.)
- **SPL token support**
- **Staking functionality**

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm 8+
- PostgreSQL database (Neon, Railway, etc.)

### Installation

```bash
# Clone repository
git clone https://github.com/stusseligmini/Celora-platform.git
cd Celora-platform

# Install all dependencies
npm run install:all

# Set up environment variables
cp .env.template .env
# Edit .env with your configuration

# Generate Prisma client
npm run prisma:generate

# Start development servers
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:10000

### Environment Variables

Create `.env` file with:

```env
# Database
DATABASE_URL="postgresql://username:password@host:5432/database"

# JWT
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-key"

# Email (SendGrid)
SENDGRID_API_KEY="your-sendgrid-api-key"
FROM_EMAIL="noreply@celora.net"

# CORS
CORS_ORIGIN="http://localhost:3000,https://celora.net"

# Node Environment
NODE_ENV="development"
```

## 🛠️ Development

### Frontend Development
```bash
cd celora-wallet
npm run dev
```

### Backend Development
```bash
cd celora-backend
npm run dev
```

### Database Operations
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Open Prisma Studio
cd celora-backend && npm run prisma:studio
```

## 🚀 Production Deployment

### Build
```bash
npm run build
```

### Deploy
```bash
npm run deploy
```

### Manual Deployment Steps:

1. **Frontend (Netlify)**:
   ```bash
   cd celora-wallet
   npm run build
   # Deploy `out/` directory to Netlify
   ```

2. **Backend (Render/Railway)**:
   ```bash
   cd celora-backend
   npm run build
   # Deploy to your Node.js hosting platform
   ```

3. **Database**: 
   - Use Neon, Supabase, or Railway PostgreSQL
   - Run migrations: `npm run prisma:migrate`

## 📚 API Documentation

Backend API is available at: `http://localhost:10000/api/docs`

### Key Endpoints:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/wallets` - List user wallets
- `POST /api/transactions/send` - Send cryptocurrency
- `GET /api/transactions` - Transaction history
- `WebSocket /api/ws` - Real-time updates

## 🔐 Security Features

- **JWT Authentication** with refresh tokens
- **Rate limiting** (100 req/15min general, 5 req/15min auth)
- **Brute force protection**
- **Email verification** required
- **CORS protection**
- **Helmet security headers**
- **Request size limiting**
- **Input validation** with Joi
- **SQL injection protection** with Prisma

## 🏃‍♂️ Technology Stack

### Frontend
- **Next.js 15** (App Router)
- **React 19** with TypeScript
- **Tailwind CSS 4** with custom theme
- **Solana Wallet Adapter**
- **Wagmi** for Ethereum
- **React Query** for state management
- **Lucide** icons

### Backend
- **Node.js** with Express
- **TypeScript** for type safety
- **Prisma ORM** with PostgreSQL
- **JWT** authentication
- **WebSocket** for real-time updates
- **Winston** logging
- **SendGrid** email service

### Blockchain
- **Solana Web3.js** for Solana
- **Ethers.js** for Ethereum
- **Multiple wallet adapters**
- **SPL token support**
- **Real transaction execution**

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [https://celora.net](https://celora.net)
- **Backend API**: [https://celora-backend.onrender.com](https://celora-backend.onrender.com)
- **GitHub**: [https://github.com/stusseligmini/Celora-platform](https://github.com/stusseligmini/Celora-platform)
- **Support**: Create an issue on GitHub

## ⭐ Support

If you like this project, please give it a star ⭐ on GitHub!

---

**Built with ❤️ by the Celora Team**
