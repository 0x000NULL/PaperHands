# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PaperHands is a paper trading platform for stocks and options with full tax reporting, Greeks analytics, and real-time streaming. It consists of a NestJS backend API and a React frontend, organized as a pnpm monorepo.

## Commands

```bash
# Install dependencies
pnpm install

# Development (runs both api and web concurrently)
pnpm dev

# Development (individual apps)
pnpm dev:api   # NestJS API on port 3000
pnpm dev:web   # Vite React app on port 5173

# Build
pnpm build         # Build both apps
pnpm build:api     # Build API only
pnpm build:web     # Build web only

# API Testing
pnpm --filter api test                        # Run all unit tests
pnpm --filter api test -- path/to/file.spec   # Run single test file
pnpm --filter api test:watch                  # Watch mode
pnpm --filter api test:cov                    # Coverage report
pnpm --filter api test:e2e                    # E2E tests

# Linting & Formatting
pnpm --filter api lint           # ESLint with auto-fix
pnpm --filter api format         # Prettier formatting
pnpm --filter web lint           # ESLint

# TypeORM Migrations (run from apps/api)
pnpm --filter api typeorm migration:generate src/migrations/MigrationName
pnpm --filter api typeorm migration:run
pnpm --filter api typeorm migration:revert
```

## Architecture

### Monorepo Structure
- `apps/api` - NestJS backend with TypeORM, BullMQ, Redis caching, WebSockets
- `apps/web` - React 19 + Vite + TanStack Query + Zustand + React Router

### API Modules (`apps/api/src/`)
- `auth/` - JWT authentication with Passport
- `users/` - User management and entity
- `portfolio/` - Position tracking (stocks + options), tax lots, dividends, wash sales
- `orders/` - Order placement, execution, and option expiration processing
- `market-data/` - Tradier/Finnhub API integration for quotes and options chains
- `analytics/` - Portfolio performance, realized gains, tax reporting, Greeks
- `watchlists/` - User watchlist management
- `streaming/` - Real-time WebSocket streaming via Tradier API
- `health/` - Health check endpoints
- `common/` - Shared filters, guards, decorators
- `config/` - Environment validation with class-validator

### Portfolio Services (`apps/api/src/portfolio/services/`)
- `PortfolioService` - Core position management
- `PortfolioGreeksService` - Aggregate Greeks calculations, sensitivity analysis
- `OptionAnalyticsService` - Option-specific analytics and pricing
- `OptionStrategyService` - Strategy identification (covered calls, spreads, etc.)
- `OptionTaxService` - Option tax reporting and realized gains
- `WashSaleService` - Wash sale detection and disallowed loss tracking
- `TaxLotService` - Tax lot management (FIFO, LIFO, HIFO, SPECIFIC)
- `DividendService` - Dividend tracking and DRIP support

### BullMQ Job Processors
- `OptionExpirationProcessor` - Handles option expiration events
- `QueuedOrderProcessor` - Executes queued orders when market opens
- Portfolio snapshot processor for performance tracking

### Key Backend Patterns
- Environment validation via `config/env.validation.ts` using class-validator
- Global rate limiting via ThrottlerGuard (100 req/min)
- Redis-backed caching with 5-second TTL for market quotes
- TypeORM entities with auto-sync (migrations needed for production)
- Global ValidationPipe with whitelist/transform enabled
- ClassSerializerInterceptor for @Exclude decorators (password hiding)
- JWT-protected WebSocket connections via `WsJwtGuard`

### Database Entities

**Core Entities:**
- `User` - email, passwordHash (excluded), cashBalance (default $100k)
- `Position` - symbol, quantity, avgCostBasis (unique per user+symbol)
- `Order` - symbol, side, quantity, status, orderCategory (EQUITY/OPTION)

**Options Entities:**
- `OptionPosition` - optionSymbol (OCC format), Greeks snapshot, strike, expiration
- `OptionClosure` - Closed options for tax tracking (sold, expired, exercised, assigned)

**Tax & Reporting Entities:**
- `TaxLot` - Individual share purchases for cost basis tracking
- `LotSale` - Records when tax lots are sold with realized gains
- `WashSale` - Wash sale rule tracking with disallowed losses
- `Dividend` - Dividend tracking with DRIP support

**Analytics Entities:**
- `PortfolioSnapshot` - Daily snapshots for performance tracking
- `Watchlist` / `WatchlistItem` - User watchlist management

### Key Enums

**Orders (`apps/api/src/orders/enums/`):**
- `OrderCategory`: EQUITY, OPTION
- `OptionType`: CALL, PUT
- `OrderSide`: BUY, SELL
- `OrderType`: MARKET, LIMIT, STOP, STOP_LIMIT
- `TimeInForce`: DAY, GTC, IOC, FOK
- `OrderStatus`: PENDING, FILLED, CANCELLED, EXPIRED, REJECTED

**Cost Basis (`apps/api/src/portfolio/enums/`):**
- `CostBasisMethod`: FIFO, LIFO, HIFO, SPECIFIC
- `GainType`: SHORT_TERM, LONG_TERM
- `OptionClosureType`: SOLD_TO_CLOSE, BOUGHT_TO_CLOSE, EXPIRED_WORTHLESS, EXERCISED, ASSIGNED

### Frontend Architecture

**State Management:**
- `useAuthStore` (Zustand + persist) - JWT token and user state
- TanStack Query for server state and API calls
- Protected/Public route wrappers in `App.tsx`

**Key Pages:** Dashboard (trading), Greeks (analytics), Analytics (tax/gains), Portfolio, Orders, Watchlists

**Real-time Features:** WebSocket hooks (`useStreamingQuote`, `useWebSocket`) connect to backend streaming service

### External Services
- Tradier API for market data, options chains, streaming (sandbox by default)
- Finnhub API for additional market data
- PostgreSQL (DigitalOcean managed)
- Redis/Valkey for caching and BullMQ queues

## Deployment

Deployed on DigitalOcean App Platform via `app.yaml`:
- API service at `/api` route prefix (stripped before reaching NestJS)
- Frontend as static site at `/`
- Health checks at `/health`

```bash
# Check deployment logs
doctl apps logs <app-id> --type build --follow
doctl apps logs <app-id> --type run --follow
```

## Environment Variables

Required environment variables are validated at startup. See `apps/api/.env.example`:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis connection
- `JWT_SECRET`, `JWT_EXPIRES_IN` - JWT configuration
- `TRADIER_API_TOKEN`, `TRADIER_BASE_URL` - Tradier API (optional)
- `FINNHUB_API_KEY`, `FINNHUB_BASE_URL` - Finnhub API
- `PORT`, `NODE_ENV` - Application settings
