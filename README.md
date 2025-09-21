# Celora V2 - Supabase Virtual Card Platform# Celora V2 Monorepo



## 🎯 Project OverviewHerdet arkitektur for multi-chain wallet, virtuelle kort og eksperimentell "post-quantum" / ML modul (simulert foreløpig).



Celora V2 has been successfully migrated from a multi-chain crypto wallet platform to a **Supabase-only virtual card platform**. The project maintains its sophisticated monorepo architecture while focusing purely on secure virtual card management through Supabase backend integration.## Strukturoversikt

```

## 🏗️ ArchitectureCeloraV2/

  package.json          (workspaces / scripts)

### Monorepo Structure  turbo.json

```  tsconfig.base.json

CeloraV2/  packages/

├── packages/    domain/             (Zod domeneobjekter)

│   ├── core/           # Core types and utilities    infrastructure/     (env, feature flags, logger, resilient RPC, funding stub)

│   ├── domain/         # VirtualCard domain models with Zod validation    quantum/            (QuantumVault + QuantumNeuralEngine – SIMULERT)

│   ├── infrastructure/ # Supabase services, logging, environment config    core/               (Re-eksporter domain + infrastructure + quantum)

│   └── quantum/        # Post-quantum encryption simulation & neural fraud detection  scripts/              (modell-evolusjon, validering, deployment stubber)

├── apps/  ops/                  (deploy & verify stubber)

│   └── web/           # Next.js 15 web application with Supabase auth  benchmark/            (neural benchmark)

└── supabase-schema.sql # Complete database schema with RLS policies  tests/load|stress     (k6 placeholders)

```  security/             (audit / isolation stubber)

  data/neural-models/   (modellfiler)

### Technology Stack  secure/quantum-vault/ (nøkkelmateriale eksempel)

- **Frontend**: Next.js 15.5.2, React 19, TypeScript, Tailwind CSS```

- **Backend**: Supabase (PostgreSQL, Auth, Real-time, RLS)

- **Build System**: Turbo (monorepo), npm workspaces## Nøkkelelementer

- **Architecture**: Clean architecture with domain-driven design- Resilient RPC Manager: health probes + failover heuristikk.

- Strukturert logging (pino) + request context.

## 🚀 Features Implemented- Zod-basert miljøvalidering & domene.

- Heuristisk Neural Engine (ikke produksjons-ML ennå).

### ✅ Core Infrastructure- Simulert post-quantum crypto (IKKE ekte Kyber/Dilithium – kun for flyt/testing).

- **Monorepo Build System**: Turbo-powered builds with dependency management

- **Environment Management**: Type-safe environment validation with browser/server detection## Advarsel

- **Logging**: Structured JSON logging with PinoCrypto og ML er prototyper; ikke for produksjonssikkerhet eller compliance.

- **TypeScript Configuration**: Composite project references for optimal builds

## Kom i gang

### ✅ Supabase Integration```

- **Authentication**: SSR-compatible auth with session managementnpm install

- **Database**: Complete schema with virtual cards, transactions, profilesnpm run build

- **Row Level Security**: Secure data access with user-scoped policiesnpm run test

- **Real-time**: Live updates for card balance changesnpm run benchmark:neural-performance

```

### ✅ Virtual Card Management

- **Card Creation**: Generate virtual cards with masked PAN and encryptionKontinuerlig utvikling:

- **Balance Management**: Track and update card balances```

- **Transaction History**: Complete transaction logging with merchant datanpm run dev

- **Status Management**: Active/suspended/closed card states```



### ✅ Web Application## Scripts (utvalg)

- **Modern UI**: Responsive design with Tailwind CSS| Script | Beskrivelse |

- **Dashboard**: Account overview, virtual cards, transaction history|--------|-------------|

- **Authentication Flow**: Seamless Supabase auth integration| quantum-init | Init stub for quantum-komponenter |

- **Real-time Updates**: Live card and transaction updates| ai:evolve-fraud-detection | Simulert evolusjon av fraud-nett |

| ai:optimize-scaling-models | Simulert evolusjon av skalering |

### ✅ Advanced Features| validate:kyber-dilithium | Sign/verify sanity (simulert) |

- **Post-Quantum Simulation**: Quantum-resistant encryption patterns| deploy:neural-models | Publiser modellfiler (stub) |

- **Neural Fraud Detection**: ML-based transaction risk scoring| verify:rpc-resilience | Init RPC manager og rapporter (stub) |

- **Feature Flags**: Dynamic feature enablement| verify:neural-accuracy | Kaller engine med testtransaksjon |

- **Funding Bridge**: Card balance management system| verify:funding-reconciliation | Tester funding stub |

| security:audit-card-encryption | Audit stub |

## 🔧 Setup Instructions| security:test-funding-isolation | Isolation stub |



### 1. Install Dependencies## Miljøvariabler

```bashSe `.env.example` for fulle kommentarer.

cd CeloraV2Minimum:

npm install```

```SOLANA_RPC_PRIMARY=https://api.mainnet-beta.solana.com

ETH_RPC_PRIMARY=https://eth.llamarpc.com

### 2. Environment ConfigurationSUPABASE_URL=https://your-project.supabase.co

Create `.env.local` in `apps/web/`:SUPABASE_ANON_KEY=anon-key

```env```

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.coValgfrie:

NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here```

```SOLANA_RPC_FALLBACKS=https://solana-api.projectserum.com,https://rpc.ankr.com/solana

ETH_RPC_FALLBACKS=https://rpc.ankr.com/eth,https://cloudflare-eth.com

### 3. Database SetupLOG_LEVEL=info

Run the SQL schema in your Supabase dashboard:FEATURE_FLAGS=rpcVerbose=true,experimentalPQ=true,fundingV2=false

```bash```

# Copy contents of supabase-schema.sql to Supabase SQL editor

```## Testing

```

### 4. Build & Runnpm run test

```bash```

# Build all packagesEksempeltester: `packages/infrastructure/src/__tests__/env.test.ts`, `packages/quantum/src/__tests__/neuralEngine.test.ts`.

npm run build

## Benchmark

# Start development server```

cd apps/webnpm run benchmark:neural-performance

npm run dev```

```Output: ms/op.



## 📊 Database Schema## Load / Stress (k6)

```

### Core Tablesk6 run tests/load/rpc-failover.js

- **profiles**: User profile data (extends Supabase auth.users)k6 run tests/stress/funding-bridge.js

- **virtual_cards**: Card data with encryption and balance tracking```

- **transactions**: Complete transaction history with merchant infoOppdater URL-er til interne endpoints.

- **wallets**: Legacy wallet support (minimal usage)

## Roadmap

### Security Features1. Ekte ledger & funding (persistens, idempotens)

- **Row Level Security**: All tables protected with user-scoped access2. Observability (OpenTelemetry + metrics)

- **Auto-timestamps**: Automatic created_at/updated_at management3. Utvidet testdekning (RPC failover mocks)

- **User Registration**: Automatic profile creation on signup4. Ekte PQ libs når klare + nøkkellagring

5. CI pipeline (cache, sikkerhet, publishing)

## 🛠️ Development6. Web-app i `apps/web` (Next.js)



### Package Development## Lisens

```bashIngen lisensfil ennå – avklar før distribusjon.

# Build individual packages

cd packages/infrastructure---

npm run buildBidra ved å åpne issues eller PRs.


# Watch mode for development
npm run dev
```

### Testing
```bash
# Type checking
npm run typecheck

# Build verification
npm run build
```

## 🎨 UI Components

### Dashboard Components
- **VirtualCardOverview**: Card management with creation and display
- **WalletOverview**: Account summary with balance tracking
- **TransactionHistory**: Real-time transaction feed with filtering
- **DashboardHeader**: Navigation with Supabase auth integration

### Authentication
- **SupabaseProvider**: React context with auth state management
- **Auth Integration**: Seamless login/logout with session persistence

## 🔐 Security Implementation

### Authentication
- Supabase Auth with email/password and social providers
- Server-side session validation
- Automatic token refresh

### Data Security
- Row Level Security on all database tables
- User-scoped data access policies
- Encrypted card data storage
- Secure environment variable handling

### Post-Quantum Features
- Quantum encryption simulation
- Neural fraud detection algorithms
- Advanced cryptographic patterns

## 📈 Performance

### Build Optimization
- Turbo caching for fast builds
- TypeScript composite projects
- Next.js 15 with app router optimization

### Runtime Performance
- Static generation where possible
- Optimized bundle sizes (172kb total)
- Real-time updates without polling

## 🚀 Deployment

The application is ready for deployment with:
- **Vercel**: Optimized for Next.js deployment
- **Supabase**: Managed PostgreSQL with global CDN
- **Environment Variables**: Secure configuration management

## 📚 Legacy Migration

Successfully migrated from:
- Multi-chain crypto wallet (Solana/Ethereum)
- Complex RPC management
- Blockchain transaction handling

To:
- Pure Supabase virtual card platform
- Simplified architecture
- Enhanced security and reliability

## 🎯 Next Steps

1. **Authentication UI**: Add login/signup forms
2. **Card Design**: Enhanced virtual card visuals
3. **Real Transactions**: Integrate with payment processors
4. **Mobile App**: React Native implementation
5. **Analytics**: User behavior and transaction analytics

---

**Celora V2** - Secure Virtual Card Platform powered by Supabase  
*Built with modern web technologies and enterprise-grade security*