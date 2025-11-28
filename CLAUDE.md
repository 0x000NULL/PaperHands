# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PaperHands is a paper trading platform for stocks and options. It consists of a NestJS backend API and a React frontend, organized as a pnpm monorepo.

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

# API-specific commands (run from apps/api or use --filter)
pnpm --filter api test           # Run unit tests
pnpm --filter api test:watch     # Watch mode
pnpm --filter api test:e2e       # E2E tests
pnpm --filter api lint           # ESLint with auto-fix
pnpm --filter api format         # Prettier formatting

# Web-specific commands
pnpm --filter web lint           # ESLint
pnpm --filter web preview        # Preview production build
```

## Architecture

### Monorepo Structure
- `apps/api` - NestJS backend with TypeORM, BullMQ, Redis caching
- `apps/web` - React 19 + Vite + TanStack Query + Zustand + React Router

### API Modules (`apps/api/src/`)
- `auth/` - JWT authentication with Passport
- `users/` - User management and entity
- `portfolio/` - Position tracking
- `orders/` - Order placement and execution
- `market-data/` - Tradier API integration for real-time quotes
- `health/` - Health check endpoints
- `common/` - Shared filters, guards, decorators
- `config/` - Environment validation with class-validator

### Key Backend Patterns
- Environment validation via `config/env.validation.ts` using class-validator
- Global rate limiting via ThrottlerGuard (100 req/min)
- Redis-backed caching with 5-second TTL for market quotes
- TypeORM entities with auto-sync (migrations needed for production)
- Global ValidationPipe with whitelist/transform enabled
- ClassSerializerInterceptor for @Exclude decorators (password hiding)

### Database Entities
- `User` - email, passwordHash (excluded), cashBalance (default $100k)
- `Position` - symbol, quantity, avgCostBasis (unique per user+symbol)
- `Order` - symbol, side (buy/sell), quantity, status (pending/filled/cancelled)

### Frontend State Management
- `useAuthStore` (Zustand + persist) - JWT token and user state
- TanStack Query for server state and API calls
- Protected/Public route wrappers in App.tsx

### External Services
- Tradier API for market data (sandbox by default)
- PostgreSQL (DigitalOcean managed)
- Redis/Valkey for caching and BullMQ queues

## Environment Variables

Required environment variables are validated at startup. See `apps/api/.env.example`:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST`, `REDIS_PASSWORD` - Redis connection
- `JWT_SECRET` - JWT signing key
- `TRADIER_API_TOKEN` - Tradier API access token
