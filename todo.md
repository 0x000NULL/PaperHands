# PaperHands Feature Todo List

A comprehensive checklist combining the feature roadmap with implementation status.

---

## Priority Roadmap

### Immediate Priority (Phase 1)
| # | Task | Section | Notes |
|---|------|---------|-------|
| 1 | Price Alerts & Notifications | §8 | High user value |
| 2 | Short Equity Selling | §14 | Core trading feature |
| 3 | Technical Indicators (RSI, MACD, BB) | §3 | Chart enhancement |
| 4 | Chart Drawing Tools | §3 | Trend lines, S/R |
| 5 | Dark Mode | §11 | High demand UX |

### Medium Priority (Phase 2)
| # | Task | Section | Notes |
|---|------|---------|-------|
| 6 | Advanced Options Strategies | §7 | Spreads, Iron Condors |
| 7 | Option Assignment Automation | §7 | Framework exists |
| 8 | CSV/PDF Export | §15 | Data portability |
| 9 | Mobile Responsive Foundation | §12 | useMediaQuery, grids, nav |
| 10 | Account Reset Feature | §14 | Start fresh |
| 11 | News Feed Integration | §9 | Market context |

### Mobile & PWA (Phase 3)
| # | Task | Section | Notes |
|---|------|---------|-------|
| 12 | Mobile Page Layouts | §12 | Dashboard, Analytics responsive |
| 13 | Mobile Component Layouts | §12 | OptionsChain cards, tables |
| 14 | PWA Core Setup | §13 | vite-plugin-pwa, manifest |
| 15 | PWA Offline Support | §13 | Caching, offline fallback |

### Social & Engagement (Phase 4)
| # | Task | Section | Notes |
|---|------|---------|-------|
| 16 | Leaderboards | §10 | Competition |
| 17 | Trading Journal | §15 | Notes, screenshots |
| 18 | Keyboard Shortcuts | §11 | Power users |
| 19 | Earnings Calendar | §9 | Market events |
| 20 | Public Profiles | §10 | Opt-in sharing |

### Advanced (Phase 5)
| # | Task | Section | Notes |
|---|------|---------|-------|
| 21 | Level 2 Data | §5 | Depth of book |
| 22 | API Access | §15 | Personal API keys |
| 23 | 2FA Authentication | §16 | Security |
| 24 | PWA Push Notifications | §13 | Order fills, alerts |
| 25 | Mobile Apps (Native) | §17 | iOS/Android |
| 26 | Copy Trading | §10 | Social trading |

---

# Features

---

## 1. Core Order System

| Feature | Status | Notes |
|---------|--------|-------|
| Limit Orders | ✅ Done | |
| Stop Orders | ✅ Done | |
| Stop-Limit Orders | ✅ Done | |
| Trailing Stop | ✅ Done | |
| Good-Till-Canceled (GTC) | ✅ Done | |
| Day Orders | ✅ Done | |
| Extended Hours Orders | ✅ Done | Limit orders only, 2x spread simulation |
| Order Modification | ✅ Done | With audit trail |
| Order Cancellation | ✅ Done | |
| IOC (Immediate-Or-Cancel) | ✅ Done | With liquidity-based partial fills |
| FOK (Fill-Or-Kill) | ✅ Done | All-or-nothing with size-based rejection |

---

## 2. Portfolio Management

| Feature | Status | Notes |
|---------|--------|-------|
| Performance Charts | ✅ Done | Via snapshots |
| Daily/Weekly/Monthly Returns | ✅ Done | |
| Yearly/All-Time Returns | ✅ Done | |
| Benchmark Comparison (SPY) | ✅ Done | |
| Realized vs Unrealized Gains | ✅ Done | |
| Dividend Tracking | ✅ Done | |
| Dividend History | ✅ Done | |
| DRIP Support | ✅ Done | |
| Tax Lot Tracking | ✅ Done | FIFO, LIFO, HIFO, SPECIFIC |
| Cost Basis Methods | ✅ Done | |
| Trade Statistics | ✅ Done | Win rate, Sharpe ratio |
| Max Drawdown | ✅ Done | |
| Custom Benchmark Selection | ✅ Done | SPY, QQQ, DIA, IWM, VTI |
| Allocation Breakdown (Pie) | ✅ Done | Interactive pie chart with Recharts |
| Sector Allocation View | ✅ Done | Via Finnhub company profile |
| Dividend Yield Display | ✅ Done | Via Finnhub stock metrics |

---

## 3. Charting & Technical Analysis

| Feature | Status | Notes |
|---------|--------|-------|
| Interactive Price Charts | ✅ Done | Lightweight Charts |
| Candlestick Charts | ✅ Done | |
| Line Charts | ✅ Done | |
| Bar Charts | ✅ Done | |
| Multiple Timeframes | ✅ Done | 1m, 5m, 15m, 30m, 1h, 4h, daily |

---

## 4. Watchlists & Screeners

| Feature | Status | Notes |
|---------|--------|-------|
| Multiple Watchlists | ✅ Done | |
| Watchlist CRUD | ✅ Done | |
| Drag & Drop Reordering | ✅ Done | |
| Stock Screener | ✅ Done | Price, volume, change filters |
| Pre-built Screeners | ✅ Done | Gainers, losers, actives |
| Customizable Columns | ⬜ Todo | |
| P/E Ratio Filter | ⬜ Todo | |
| Market Cap Filter | ⬜ Todo | |
| Sector Filter | ⬜ Todo | |
| 52-Week High/Low Screener | ⬜ Todo | |
| Sector Heat Maps | ⬜ Todo | Component exists, needs data |

---

## 5. Real-Time Data & Streaming

| Feature | Status | Notes |
|---------|--------|-------|
| WebSocket Price Streaming | ✅ Done | Via Tradier |
| Live Bid/Ask/Last Updates | ✅ Done | |
| Real-time P&L Updates | ✅ Done | |
| Market Status Indicator | ✅ Done | With countdown timer |
| Level 2 Data (Depth of Book) | ⬜ Todo | |
| Time & Sales (Trade Tape) | ⬜ Todo | |

---

## 6. Options: Basic

| Feature | Status | Notes |
|---------|--------|-------|
| Options Chain | ✅ Done | With Greeks |
| Greeks Display | ✅ Done | Delta, gamma, theta, vega |
| Implied Volatility | ✅ Done | |
| Covered Call Strategy | ✅ Done | Detection & margin calc |
| Cash-Secured Put Strategy | ✅ Done | |
| Portfolio Greeks | ✅ Done | Aggregated delta/gamma/theta/vega/rho |
| Greeks Sensitivity Analysis | ✅ Done | |

---

## 7. Options: Advanced

| Feature | Status | Notes |
|---------|--------|-------|
| IV Rank/Percentile | ✅ Done | VolatilityService with 52-week IV rank/percentile |
| Historical Volatility | ✅ Done | HV20/30/60 calculation from price candles |
| Vertical Spreads | ✅ Done | MultiLegOrderService with atomic execution |
| Iron Condors | ✅ Done | MultiLegOrderService with strategy validation |
| Straddles | ✅ Done | MultiLegOrderService with atomic execution |
| Strangles | ✅ Done | MultiLegOrderService with atomic execution |
| Options P&L Calculator | ✅ Done | OptionsPnLCalculator frontend component |
| Option Payoff Diagram | ✅ Done | PayoffDiagram SVG visualization |
| Exercise Options | ✅ Done | ManualExerciseService for early exercise |
| Assignment Handling | ✅ Done | Framework in ManualExerciseService |
| Rollover Tools | ✅ Done | RolloverService for roll forward/up/down/diagonal |

---

## 8. Alerts & Notifications

| Feature | Status | Notes |
|---------|--------|-------|
| Price Alerts | ⬜ Todo | 🔴 High priority |
| Percent Change Alerts | ⬜ Todo | |
| Volume Alerts | ⬜ Todo | |
| Order Fill Notifications | ⬜ Todo | |
| Earnings Alerts | ⬜ Todo | |
| News Alerts | ⬜ Todo | |
| In-App Toast Notifications | ⬜ Todo | |
| Email Notifications | ⬜ Todo | |
| Push Notifications | ⬜ Todo | |
| Greeks Threshold Alerts | ⬜ Todo | |
| Portfolio Value Alerts | ⬜ Todo | |

---

## 9. News & Research

| Feature | Status | Notes |
|---------|--------|-------|
| News Feed | ⬜ Todo | |
| Symbol-Specific News | ⬜ Todo | |
| Earnings Calendar | ⬜ Todo | |
| Economic Calendar | ⬜ Todo | |
| Analyst Ratings | ⬜ Todo | |
| SEC Filings | ⬜ Todo | |
| Insider Trading Data | ⬜ Todo | |
| Company Fundamentals | ⬜ Todo | Revenue, EPS, P/E, etc. |

---

## 10. Social & Community

| Feature | Status | Notes |
|---------|--------|-------|
| Leaderboards | ⬜ Todo | |
| Public Profiles | ⬜ Todo | Opt-in |
| Copy Trading | ⬜ Todo | |
| Trading Competitions | ⬜ Todo | |
| Social Feed | ⬜ Todo | |
| Comments & Reactions | ⬜ Todo | |
| Follow System | ⬜ Todo | |

---

## 11. User Experience

| Feature | Status | Notes |
|---------|--------|-------|
| Dark Mode | ⬜ Todo | |
| Light Mode Toggle | ⬜ Todo | |
| Keyboard Shortcuts | ⬜ Todo | |
| Widget Dashboard | ⬜ Todo | Draggable layout |
| Quick Trade Widget | ⬜ Todo | Floating panel |
| Recent Symbols | ⬜ Todo | |
| Search Autocomplete | ⬜ Todo | Symbol + company name |
| Onboarding Tutorial | ⬜ Todo | |

---

## 12. Mobile Responsive Design

**Current State: 4/10** - Desktop-only layouts, breakpoints defined but unused

### Phase 1 - Foundation (Do First)

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Create useMediaQuery hook | ⬜ Todo | 🔴 Critical | Currently no way to detect screen size |
| Implement responsive grid system | ⬜ Todo | 🔴 Critical | Replace fixed `gridTemplateColumns` throughout |
| Add hamburger navigation menu | ⬜ Todo | 🔴 Critical | Current nav doesn't collapse on mobile |
| Touch-friendly button sizing | ⬜ Todo | 🔴 Critical | 48px minimum tap targets |

### Phase 2 - Page Layouts

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Dashboard responsive layout | ⬜ Todo | 🔴 Critical | Fixed 3-column grid: `1.5fr 1fr 1fr` |
| Analytics responsive layout | ⬜ Todo | 🟡 Medium | Fixed `2fr 1fr` grid |
| Greeks responsive layout | ⬜ Todo | 🟡 Medium | Fixed `2fr 1fr` grid |
| Portfolio responsive layout | ⬜ Todo | 🟡 Medium | |
| Orders responsive layout | ⬜ Todo | 🟢 Low | |

### Phase 3 - Component Mobile Layouts

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| OptionsChainTable card layout | ⬜ Todo | 🔴 Critical | 9 columns impossible on mobile, need card alternative |
| PositionsTable mobile view | ⬜ Todo | 🟡 Medium | Stackable card layout |
| Greeks sensitivity table mobile | ⬜ Todo | 🟡 Medium | Needs pagination/cards |
| Tax lots table mobile view | ⬜ Todo | 🟡 Medium | Complex data, card layout |
| TradeForm mobile optimization | ⬜ Todo | 🟢 Low | Already decent, minor tweaks |
| QuotePanel mobile layout | ⬜ Todo | 🟢 Low | |
| PortfolioSummary mobile (5-col grid) | ⬜ Todo | 🟡 Medium | `repeat(5, 1fr)` unreadable on mobile |

### Phase 4 - Polish

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Responsive font scaling | ⬜ Todo | 🟢 Low | Fixed 12px font sizes |
| Mobile-optimized chart interactions | ⬜ Todo | 🟢 Low | Pinch-to-zoom, touch gestures |
| Swipe gestures for navigation | ⬜ Todo | 🟢 Low | |
| Mobile keyboard handling | ⬜ Todo | 🟢 Low | Input focus, viewport adjustment |

---

## 13. Progressive Web App (PWA)

**Current State: 0/10** - No PWA features exist

### Phase 1 - Core PWA Setup

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Install vite-plugin-pwa | ⬜ Todo | 🔴 Critical | Core PWA support for Vite |
| Create manifest.json | ⬜ Todo | 🔴 Critical | App name, icons, theme color, display mode |
| Add PWA meta tags to index.html | ⬜ Todo | 🔴 Critical | theme-color, apple-touch-icon, apple-mobile-web-app-capable |
| Create app icons (192px, 512px) | ⬜ Todo | 🔴 Critical | Required for installability |
| Configure service worker | ⬜ Todo | 🔴 Critical | Basic caching strategy |

### Phase 2 - Offline Support

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Cache static assets | ⬜ Todo | 🟡 Medium | JS, CSS, images via Workbox |
| Cache API responses (read-only) | ⬜ Todo | 🟡 Medium | Positions, portfolio snapshots |
| Offline fallback page | ⬜ Todo | 🟡 Medium | Show cached data when offline |
| Background sync for orders | ⬜ Todo | 🟢 Low | Queue orders placed offline |
| Stale-while-revalidate for quotes | ⬜ Todo | 🟡 Medium | Show cached, fetch fresh |

### Phase 3 - Enhanced Features

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Push notifications for order fills | ⬜ Todo | 🟡 Medium | Requires backend integration |
| Push notifications for price alerts | ⬜ Todo | 🟡 Medium | Ties into Alerts feature |
| App install prompt | ⬜ Todo | 🟢 Low | Custom "Add to Home Screen" UI |
| Periodic background sync | ⬜ Todo | 🟢 Low | Update portfolio data in background |
| Share target API | ⬜ Todo | 🟢 Low | Share symbols to app |

### Trading-Specific Challenges

| Challenge | Mitigation | Notes |
|-----------|------------|-------|
| Real-time streaming in background | Service worker can't maintain WebSocket | Show "last updated" timestamp, refresh on focus |
| Stale price data | Clear visual indicators | Badge/banner when data is cached |
| Order execution offline | Queue with warning | "Will execute when online" |
| Greeks calculations need live data | Cache with expiration | Show calculation timestamp |

---

## 14. Paper Trading Specific

| Feature | Status | Notes |
|---------|--------|-------|
| Reset Account | ⬜ Todo | Start fresh with $100k |
| Adjustable Starting Balance | ⬜ Todo | |
| Simulated Order Delays | ⬜ Todo | Add realism |
| Slippage Simulation | ⬜ Todo | Market impact |
| Commission Simulation | ⬜ Todo | Fee structures |
| Multiple Paper Accounts | ⬜ Todo | Test strategies |
| Strategy Notes/Tags | ⬜ Todo | |
| Replay Mode | ⬜ Todo | Backtest on historical |
| Short Selling (Equity) | ⬜ Todo | 🔴 Currently options only |
| Fractional Shares | ⬜ Todo | |

---

## 15. Power User Features

| Feature | Status | Notes |
|---------|--------|-------|
| API Access | ⬜ Todo | Personal API keys |
| Webhook Integrations | ⬜ Todo | |
| CSV Export | ⬜ Todo | Trade history, positions |
| Excel Export | ⬜ Todo | |
| PDF Reports | ⬜ Todo | Weekly/monthly summaries |
| TradingView Integration | ⬜ Todo | Embed charts |
| Discord Bot | ⬜ Todo | Trade notifications |
| Slack Bot | ⬜ Todo | |
| Trading Journal | ⬜ Todo | Notes, screenshots |

---

## 16. Account & Security

| Feature | Status | Notes |
|---------|--------|-------|
| Two-Factor Authentication | ⬜ Todo | TOTP support |
| Password Reset | ⬜ Todo | Email-based |
| Session Management | ⬜ Todo | View/revoke sessions |
| Activity Log | ⬜ Todo | Login history |
| Account Deletion | ⬜ Todo | GDPR compliant |
| Profile Settings | ⬜ Todo | Name, avatar |
| Biometric Login | ⬜ Todo | Mobile |

---

## 17. Native Mobile Apps

| Feature | Status | Notes |
|---------|--------|-------|
| iOS App | ⬜ Todo | React Native or Swift |
| Android App | ⬜ Todo | React Native or Kotlin |
| Push Notifications | ⬜ Todo | |
| Face ID / Fingerprint | ⬜ Todo | |
| Home Screen Widgets | ⬜ Todo | |
| Apple Watch App | ⬜ Todo | |
| WearOS App | ⬜ Todo | |

---

# Technical Debt & Codebase Improvements

This section tracks non-feature improvements to code quality, architecture, testing, performance, security, and DevOps.

---

## Technical Debt Priority Order

### Immediate (Do First)
1. ⬜ Create GitHub Actions CI/CD workflow (§18)
2. ⬜ Create production Dockerfile (§18)
3. ⬜ Fix N+1 query in portfolio.service.ts - batch option quotes (§21)
4. ⬜ Add unit tests for TaxLotService (§20)
5. ⬜ Add unit tests for WashSaleService (§20)
6. ⬜ Set up Vitest for frontend testing (§20)

### Short-Term (Next Sprint)
7. ⬜ Split OrdersService into smaller services (§19)
8. ⬜ Wrap order execution in database transactions (§19)
9. ⬜ Add missing database indexes (§21)
10. ⬜ Add unit tests for OptionTaxService (§20)
11. ⬜ Add unit tests for PortfolioGreeksService (§20)
12. ⬜ Create docker-compose for development (§18)

### Medium-Term (Next Month)
13. ⬜ Create centralized error hierarchy (§19)
14. ⬜ Enable strict TypeScript settings (§19)
15. ⬜ Add integration tests for order-to-tax-lot flow (§20)
16. ⬜ Add Swagger API documentation (§25)
17. ⬜ Implement structured logging with correlation IDs (§24)
18. ⬜ Add JSDoc to complex services (§25)

### Long-Term (Ongoing)
19. ⬜ Achieve 80% test coverage
20. ⬜ Integrate error monitoring (Sentry) (§24)
21. ⬜ Add Prometheus metrics (§24)
22. ⬜ Create architecture decision records (§25)
23. ⬜ Frontend performance optimization (§21)

---

## 18. DevOps & Tooling

### CI/CD Pipeline

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Create GitHub Actions workflow | ⬜ Todo | 🔴 Critical | No `.github/workflows/` exists |
| Add lint step (ESLint + Prettier) | ⬜ Todo | 🔴 Critical | Part of CI workflow |
| Add test step with coverage | ⬜ Todo | 🔴 Critical | Jest with coverage reporting |
| Add build step | ⬜ Todo | 🔴 Critical | Compile TypeScript, build Docker image |
| Add security scanning (SNYK/Dependabot) | ⬜ Todo | 🟡 Medium | Dependency vulnerability scanning |
| Add automated deployment | ⬜ Todo | 🟡 Medium | Deploy to staging/production on merge |

### Docker Configuration

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Create production Dockerfile for API | ⬜ Todo | 🔴 Critical | Multi-stage build, node:20-alpine, non-root user |
| Add health check to Dockerfile | ⬜ Todo | 🟡 Medium | HEALTHCHECK instruction |
| Create docker-compose.yml for development | ⬜ Todo | 🟡 Medium | API + PostgreSQL + Redis with volume mounts |
| Create docker-compose.prod.yml | ⬜ Todo | 🟢 Low | Production configuration |

### Environment Configuration

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Expand .env.example with all variables | ⬜ Todo | 🟡 Medium | Currently minimal |
| Add descriptions for each env variable | ⬜ Todo | 🟡 Medium | Document required vs optional |
| Add example values for dev setup | ⬜ Todo | 🟢 Low | Make onboarding easier |

### Application Startup

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Add database connectivity check | ⬜ Todo | 🟡 Medium | Verify before binding to port |
| Add Redis connectivity check | ⬜ Todo | 🟡 Medium | Verify before binding to port |
| Verify all required env vars | ⬜ Todo | 🟡 Medium | Fail fast on missing config |

---

## 19. Code Quality & Architecture

### Service Refactoring (God Object Anti-Pattern)

| Task | Status | Priority | File(s) | Notes |
|------|--------|----------|---------|-------|
| Split OrdersService (2419 lines) | ⬜ Todo | 🔴 Critical | `apps/api/src/orders/orders.service.ts` | Extract into OrderExecutionService, OrderValidationService, OptionOrderService, OrderAuditService. Target: ~600 lines max |
| Refactor WashSaleService (613 lines) | ⬜ Todo | 🟡 Medium | `apps/api/src/portfolio/services/wash-sale.service.ts` | Extract wash sale window calculation to utility, consider background job for detection |
| Refactor PortfolioGreeksService (600 lines) | ⬜ Todo | 🟡 Medium | `apps/api/src/portfolio/services/portfolio-greeks.service.ts` | Split Greeks calculation from sensitivity analysis |

### Database Transaction Management

| Task | Status | Priority | File(s) | Notes |
|------|--------|----------|---------|-------|
| Wrap order execution in transactions | ⬜ Todo | 🔴 Critical | `orders.service.ts:287-320` | Updates User + Position + TaxLot separately without atomicity |
| Add transaction to wash sale detection | ⬜ Todo | 🟡 Medium | `wash-sale.service.ts` | Reads multiple entities without coordination |
| Add transaction to option closures | ⬜ Todo | 🟡 Medium | `option-tax.service.ts` | Updates without atomic consistency guarantees |
| Create transaction helper utilities | ⬜ Todo | 🟡 Medium | `apps/api/src/common/` | Reusable patterns for DataSource.createQueryRunner() |

### Type Safety

| Task | Status | Priority | File(s) | Notes |
|------|--------|----------|---------|-------|
| Remove all `as any` casts | ⬜ Todo | 🟡 Medium | Multiple files | Run `grep -r "as any"` to audit, replace with proper types |
| Enable `noImplicitAny: true` | ⬜ Todo | 🟡 Medium | `tsconfig.json` | Catch implicit any types at compile time |
| Fix OnboardingWizard types | ⬜ Todo | 🟢 Low | `apps/web/src/components/onboarding/OnboardingWizard.tsx` | Uses `data as any` |
| Add strict null checks | ⬜ Todo | 🟡 Medium | `tsconfig.json` | Enable `strictNullChecks` |

### Error Handling

| Task | Status | Priority | File(s) | Notes |
|------|--------|----------|---------|-------|
| Create centralized error hierarchy | ⬜ Todo | 🟡 Medium | `apps/api/src/common/exceptions/` | Create business.exception.ts, database.exception.ts, external-service.exception.ts |
| Add error handling to OptionStrategyService | ⬜ Todo | 🟡 Medium | `option-strategy.service.ts` | No handling for missing positions |
| Standardize error response format | ⬜ Todo | 🟡 Medium | `http-exception.filter.ts` | Add more detailed error context |
| Add validation for all service inputs | ⬜ Todo | 🟡 Medium | All services | Comprehensive input validation |

### Module Organization

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Create sub-folders in portfolio module | ⬜ Todo | 🟢 Low | Split into `portfolio/tax-reporting/`, `portfolio/greeks/`, `portfolio/position-management/` |
| Document module dependencies | ⬜ Todo | 🟢 Low | Create module dependency graph |
| Create facade services for module boundaries | ⬜ Todo | 🟢 Low | Reduce tight coupling across modules |
| Reduce repository injection complexity | ⬜ Todo | 🟢 Low | OrdersService has 10 dependencies - group into facades |

---

## 20. Testing

### Unit Tests (API)

| Task | Status | Priority | File to Test | Notes |
|------|--------|----------|--------------|-------|
| Test TaxLotService | ⬜ Todo | 🔴 Critical | `apps/api/src/portfolio/services/tax-lot.service.ts` | FIFO, LIFO, HIFO, SPECIFIC lot selection |
| Test WashSaleService | ⬜ Todo | 🔴 Critical | `apps/api/src/portfolio/services/wash-sale.service.ts` | 30-day window, disallowed loss calculation |
| Test OptionTaxService | ⬜ Todo | 🔴 Critical | `apps/api/src/portfolio/services/option-tax.service.ts` | Option closure tax implications |
| Test PortfolioGreeksService | ⬜ Todo | 🔴 Critical | `apps/api/src/portfolio/services/portfolio-greeks.service.ts` | Aggregate Greeks calculations |
| Test AnalyticsService | ⬜ Todo | 🟡 Medium | `apps/api/src/analytics/analytics.service.ts` | Performance metrics, returns |
| Test DividendService | ⬜ Todo | 🟡 Medium | `apps/api/src/portfolio/services/dividend.service.ts` | DRIP, dividend tracking |
| Test OptionStrategyService | ⬜ Todo | 🟡 Medium | `apps/api/src/portfolio/services/option-strategy.service.ts` | Strategy detection |
| Test OptionAnalyticsService | ⬜ Todo | 🟡 Medium | `apps/api/src/portfolio/services/option-analytics.service.ts` | Option pricing |
| Test MarketHoursService | ⬜ Todo | 🟢 Low | `apps/api/src/market-data/services/market-hours.service.ts` | Market open/close detection |
| Test StreamingService | ⬜ Todo | 🟢 Low | `apps/api/src/streaming/streaming.service.ts` | WebSocket connection handling |

### Integration Tests (API)

| Task | Status | Priority | Test Scenario | Notes |
|------|--------|----------|---------------|-------|
| Order-to-TaxLot flow | ⬜ Todo | 🔴 Critical | Complete trade execution with tax lot creation | |
| Wash sale detection flow | ⬜ Todo | 🔴 Critical | Sell at loss → buy within 30 days → verify disallowed loss | Edge cases: partial wash, multiple lots |
| Option expiration flow | ⬜ Todo | 🟡 Medium | Option expires → position closed → tax recorded | ITM/OTM scenarios |
| Dividend processing flow | ⬜ Todo | 🟡 Medium | Ex-date → record date → pay date → DRIP reinvestment | |
| Concurrent order execution | ⬜ Todo | 🟡 Medium | Multiple orders for same symbol simultaneously | Race condition testing |
| Portfolio Greeks aggregation | ⬜ Todo | 🟡 Medium | Multiple option positions → aggregate Greeks | |

### E2E Tests

| Task | Status | Priority | Test Scenario | Notes |
|------|--------|----------|---------------|-------|
| Set up E2E testing framework | ⬜ Todo | 🔴 Critical | Configure Jest or Supertest for E2E | |
| User registration → first trade | ⬜ Todo | 🟡 Medium | Complete new user journey | |
| Login → trade → view portfolio | ⬜ Todo | 🟡 Medium | Authenticated user flow | |
| Generate tax report flow | ⬜ Todo | 🟡 Medium | Full tax reporting with wash sales | |
| Error scenarios | ⬜ Todo | 🟡 Medium | Insufficient funds, invalid orders, market closed | |
| WebSocket streaming test | ⬜ Todo | 🟢 Low | Connect, receive quotes, disconnect | |

### Frontend Tests

| Task | Status | Priority | Component/Hook | Notes |
|------|--------|----------|----------------|-------|
| Set up Vitest for React | ⬜ Todo | 🔴 Critical | `apps/web/` | Currently 0 test files |
| Test Dashboard component | ⬜ Todo | 🟡 Medium | `Dashboard.tsx` | Main trading interface |
| Test TradeForm component | ⬜ Todo | 🟡 Medium | `TradeForm.tsx` | Order submission |
| Test OptionsChainPanel | ⬜ Todo | 🟡 Medium | `OptionsChainPanel.tsx` | Options chain display |
| Test PortfolioSummary | ⬜ Todo | 🟡 Medium | `PortfolioSummary.tsx` | Portfolio value display |
| Test usePortfolio hook | ⬜ Todo | 🟡 Medium | `usePortfolio.ts` | Data fetching |
| Test useOrders hook | ⬜ Todo | 🟡 Medium | `useOrders.ts` | Order management |
| Test useWebSocket hook | ⬜ Todo | 🟡 Medium | `useWebSocket.ts` | Real-time streaming |
| Test useAuthStore | ⬜ Todo | 🟡 Medium | Zustand store | Auth state management |

---

## 21. Performance Optimization

### Database Performance

| Task | Status | Priority | Location | Notes |
|------|--------|----------|----------|-------|
| Add index: Order(userId, createdAt) | ⬜ Todo | 🟡 Medium | Order entity | Order history pagination |
| Add index: OrderAudit(orderId, createdAt) | ⬜ Todo | 🟡 Medium | OrderAudit entity | Audit trail queries |
| Add index: OptionPosition(expirationDate) | ⬜ Todo | 🟡 Medium | OptionPosition entity | Expiration processing |
| Add index: User(createdAt) | ⬜ Todo | 🟢 Low | User entity | User listing queries |
| Add LIMIT to large queries | ⬜ Todo | 🟡 Medium | `analytics.service.ts` | Portfolio snapshots pagination |
| Consider denormalizing portfolio summary | ⬜ Todo | 🟢 Low | New table | Avoid repeated calculations |

### N+1 Query Fixes

| Task | Status | Priority | Location | Notes |
|------|--------|----------|----------|-------|
| Batch option quote fetching | ⬜ Todo | 🔴 Critical | `portfolio.service.ts:181-195` | Loops through positions making individual API calls |
| Implement TradierService.getOptionQuotes() | ⬜ Todo | 🔴 Critical | `tradier.service.ts` | New batch method for multiple symbols |
| Cache option quotes per request | ⬜ Todo | 🟡 Medium | `portfolio.service.ts` | Avoid repeated fetches within same request |

### Frontend Performance

| Task | Status | Priority | Location | Notes |
|------|--------|----------|----------|-------|
| Extract inline styles to CSS modules | ⬜ Todo | 🟡 Medium | `TradeForm.tsx` | 80+ lines of inline styles |
| Memoize expensive components | ⬜ Todo | 🟡 Medium | Dashboard components | Use React.memo strategically |
| Implement code splitting | ⬜ Todo | 🟡 Medium | `App.tsx` | Lazy load routes |
| Lazy load charts | ⬜ Todo | 🟢 Low | `ChartContainer.tsx` | Heavy library, load on demand |

### Caching Improvements

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Analyze cache hit rates | ⬜ Todo | 🟢 Low | Add metrics for Redis cache performance |
| Extend TTL for static data | ⬜ Todo | 🟢 Low | Watchlists, user preferences (currently 5s for all) |
| Add cache invalidation on mutations | ⬜ Todo | 🟡 Medium | Invalidate relevant cache on writes |
| Add cache statistics endpoint | ⬜ Todo | 🟢 Low | `/health/cache` for monitoring |

---

## 22. Security Improvements

### Authentication & Authorization

| Task | Status | Priority | Location | Notes |
|------|--------|----------|----------|-------|
| Add rate limiting for token refresh | ⬜ Todo | 🟡 Medium | `auth.controller.ts` | Prevent token abuse |
| Document WebSocket auth security | ⬜ Todo | 🟢 Low | `ws-jwt.guard.ts` | Comment indicates previous query param tokens |
| Add test for query param token rejection | ⬜ Todo | 🟡 Medium | Auth tests | Ensure tokens only via headers |
| Review all WebSocket auth paths | ⬜ Todo | 🟡 Medium | Streaming module | Security audit |

### Input Validation

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Audit all @Body decorators for validation | ⬜ Todo | 🟡 Medium | Ensure DTO classes have full validation |
| Audit all @Query decorators | ⬜ Todo | 🟡 Medium | Query parameter validation |
| Audit all @Param decorators | ⬜ Todo | 🟡 Medium | Path parameter validation |
| Test boundary conditions | ⬜ Todo | 🟡 Medium | Negative quantities, extreme prices, overflow |

### Data Protection

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Audit error messages for data leakage | ⬜ Todo | 🟢 Low | Ensure no sensitive data in error responses |
| Add logging sanitization | ⬜ Todo | 🟡 Medium | Prevent password/token logging |
| Review all @Exclude decorators | ⬜ Todo | 🟢 Low | Ensure sensitive fields excluded from responses |

---

## 23. Dependencies & Maintenance

### Dependency Audits

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Run npm audit and fix vulnerabilities | ⬜ Todo | 🟡 Medium | Security vulnerabilities |
| Check for outdated packages | ⬜ Todo | 🟢 Low | TypeORM 0.3.27, etc. |
| Review unused dependencies | ⬜ Todo | 🟢 Low | Remove bloat |
| Set up Dependabot | ⬜ Todo | 🟢 Low | Automated dependency updates |

### Code Cleanup

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Remove dead code | ⬜ Todo | 🟢 Low | Unused functions, commented code |
| Standardize import ordering | ⬜ Todo | 🟢 Low | Consistent import style |
| Fix ESLint warnings | ⬜ Todo | 🟢 Low | Address all linter warnings |

---

## 24. Logging & Monitoring

### Structured Logging

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Replace console.log with Logger | ⬜ Todo | 🟡 Medium | Only 5 console.log statements exist |
| Add request correlation IDs | ⬜ Todo | 🟡 Medium | Middleware to generate and propagate request IDs |
| Implement structured logging format | ⬜ Todo | 🟡 Medium | JSON format with context fields |
| Add performance metrics logging | ⬜ Todo | 🟢 Low | Request duration, slow query detection |
| Configure log levels per environment | ⬜ Todo | 🟢 Low | DEBUG for dev, INFO for prod |

### Error Monitoring

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Integrate Sentry (or similar) | ⬜ Todo | 🟡 Medium | Automatic error tracking |
| Add frontend error boundary reporting | ⬜ Todo | 🟡 Medium | Capture React errors |
| Set up error rate alerting | ⬜ Todo | 🟢 Low | Alert on error spike |

### Application Monitoring

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Add Prometheus metrics endpoint | ⬜ Todo | 🟢 Low | `/metrics` for scraping |
| Track API response times | ⬜ Todo | 🟢 Low | P50, P95, P99 latency |
| Monitor queue depths (BullMQ) | ⬜ Todo | 🟢 Low | Job backlog alerting |
| Track WebSocket connection count | ⬜ Todo | 🟢 Low | Connection metrics |

---

## 25. Documentation

### API Documentation

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Install @nestjs/swagger | ⬜ Todo | 🟡 Medium | OpenAPI documentation |
| Add @ApiOperation to all controllers | ⬜ Todo | 🟡 Medium | Describe each endpoint |
| Add @ApiResponse decorators | ⬜ Todo | 🟡 Medium | Document response schemas |
| Generate interactive docs at /api/docs | ⬜ Todo | 🟡 Medium | Swagger UI |
| Document authentication requirements | ⬜ Todo | 🟡 Medium | Which endpoints need JWT |

### Code Documentation

| Task | Status | Priority | File(s) | Notes |
|------|--------|----------|---------|-------|
| Add JSDoc to WashSaleService | ⬜ Todo | 🟡 Medium | `wash-sale.service.ts` | Complex 30-day rule logic |
| Add JSDoc to TaxLotService | ⬜ Todo | 🟡 Medium | `tax-lot.service.ts` | Cost basis selection algorithms |
| Add JSDoc to OptionAnalyticsService | ⬜ Todo | 🟡 Medium | `option-analytics.service.ts` | Greeks calculations |
| Add JSDoc to PortfolioGreeksService | ⬜ Todo | 🟡 Medium | `portfolio-greeks.service.ts` | Sensitivity analysis |
| Document complex algorithms | ⬜ Todo | 🟢 Low | Various | Greeks formulas, tax lot selection |

### Architecture Documentation

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Create ADR: TypeORM migration strategy | ⬜ Todo | 🟢 Low | Why auto-sync vs migrations |
| Create ADR: BullMQ for async jobs | ⬜ Todo | 🟢 Low | Why BullMQ, job patterns |
| Create ADR: Redis caching strategy | ⬜ Todo | 🟢 Low | TTLs, invalidation |
| Create ADR: Cost basis calculation | ⬜ Todo | 🟢 Low | FIFO/LIFO/HIFO implementation |
| Create module dependency diagram | ⬜ Todo | 🟢 Low | Visual architecture overview |

---

## Summary

| Category | Done | Todo | Total |
|----------|------|------|-------|
| **Features** | | | |
| 1. Core Order System | 11 | 0 | 11 |
| 2. Portfolio Management | 16 | 0 | 16 |
| 3. Charting & Technical Analysis | 6 | 13 | 19 |
| 4. Watchlists & Screeners | 5 | 5 | 10 |
| 5. Real-Time Data | 4 | 2 | 6 |
| 6. Options: Basic | 7 | 0 | 7 |
| 7. Options: Advanced | 11 | 0 | 11 |
| 8. Alerts & Notifications | 0 | 11 | 11 |
| 9. News & Research | 0 | 8 | 8 |
| 10. Social & Community | 0 | 7 | 7 |
| 11. User Experience | 0 | 8 | 8 |
| 12. Mobile Responsive | 0 | 20 | 20 |
| 13. Progressive Web App | 0 | 15 | 15 |
| 14. Paper Trading Specific | 0 | 10 | 10 |
| 15. Power User Features | 0 | 9 | 9 |
| 16. Account & Security | 0 | 7 | 7 |
| 17. Native Mobile Apps | 0 | 7 | 7 |
| **Features Subtotal** | **60** | **122** | **182** |
| | | | |
| **Technical Debt** | | | |
| 18. DevOps & Tooling | 0 | 14 | 14 |
| 19. Code Quality & Architecture | 0 | 18 | 18 |
| 20. Testing | 0 | 28 | 28 |
| 21. Performance Optimization | 0 | 14 | 14 |
| 22. Security Improvements | 0 | 10 | 10 |
| 23. Dependencies & Maintenance | 0 | 6 | 6 |
| 24. Logging & Monitoring | 0 | 11 | 11 |
| 25. Documentation | 0 | 13 | 13 |
| **Tech Debt Subtotal** | **0** | **114** | **114** |
| | | | |
| **GRAND TOTAL** | **60** | **236** | **296** |

**Feature Progress: 33% Complete**
**Tech Debt Progress: 0% Complete**
**Overall Progress: 20% Complete**
