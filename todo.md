# PaperHands Feature Todo List

A comprehensive checklist combining the feature roadmap with implementation status.

---

## 1. Advanced Order Types

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

## 2. Charting & Technical Analysis

| Feature | Status | Notes |
|---------|--------|-------|
| Interactive Price Charts | ✅ Done | Lightweight Charts |
| Candlestick Charts | ✅ Done | |
| Line Charts | ✅ Done | |
| Bar Charts | ✅ Done | |
| Area Charts | ⬜ Todo | |
| Multiple Timeframes | ✅ Done | 1m, 5m, 15m, 30m, 1h, 4h, daily |
| Weekly/Monthly Timeframes | ⬜ Todo | |
| SMA Indicator | ⬜ Todo | |
| EMA Indicator | ⬜ Todo | |
| MACD Indicator | ⬜ Todo | |
| RSI Indicator | ⬜ Todo | |
| Bollinger Bands | ⬜ Todo | |
| Volume Indicator | ⬜ Todo | |
| Trend Lines | ⬜ Todo | |
| Support/Resistance Lines | ⬜ Todo | |
| Fibonacci Retracements | ⬜ Todo | |
| Chart Comparison (Overlay) | ⬜ Todo | |
| Full-Screen Chart Mode | ⬜ Todo | |
| Price Alerts on Chart | ⬜ Todo | Visual markers |

---

## 3. Watchlists & Screeners

| Feature | Status | Notes |
|---------|--------|-------|
| Multiple Watchlists | ✅ Done | |
| Watchlist CRUD | ✅ Done | |
| Drag & Drop Reordering | ✅ Done | |
| Customizable Columns | ⬜ Todo | |
| Stock Screener | ✅ Done | Price, volume, change filters |
| P/E Ratio Filter | ⬜ Todo | |
| Market Cap Filter | ⬜ Todo | |
| Sector Filter | ⬜ Todo | |
| Pre-built Screeners | ✅ Done | Gainers, losers, actives |
| 52-Week High/Low Screener | ⬜ Todo | |
| Sector Heat Maps | ⬜ Todo | Component exists, needs data |

---

## 4. Real-Time Data & Streaming

| Feature | Status | Notes |
|---------|--------|-------|
| WebSocket Price Streaming | ✅ Done | Via Tradier |
| Live Bid/Ask/Last Updates | ✅ Done | |
| Level 2 Data (Depth of Book) | ⬜ Todo | |
| Time & Sales (Trade Tape) | ⬜ Todo | |
| Real-time P&L Updates | ✅ Done | |
| Market Status Indicator | ✅ Done | With countdown timer |

---

## 5. Portfolio Analytics

| Feature | Status | Notes |
|---------|--------|-------|
| Performance Charts | ✅ Done | Via snapshots |
| Daily/Weekly/Monthly Returns | ✅ Done | |
| Yearly/All-Time Returns | ✅ Done | |
| Benchmark Comparison (SPY) | ✅ Done | |
| Custom Benchmark Selection | ⬜ Todo | |
| Allocation Breakdown (Pie) | ⬜ Todo | |
| Sector Allocation View | ⬜ Todo | |
| Realized vs Unrealized Gains | ✅ Done | |
| Dividend Tracking | ✅ Done | |
| Dividend History | ✅ Done | |
| Dividend Yield Display | ⬜ Todo | |
| DRIP Support | ✅ Done | |
| Tax Lot Tracking | ✅ Done | FIFO, LIFO, HIFO, SPECIFIC |
| Cost Basis Methods | ✅ Done | |
| Trade Statistics | ✅ Done | Win rate, Sharpe ratio |
| Max Drawdown | ✅ Done | |

---

## 6. Options Trading

| Feature | Status | Notes |
|---------|--------|-------|
| Options Chain | ✅ Done | With Greeks |
| Greeks Display | ✅ Done | Delta, gamma, theta, vega |
| Implied Volatility | ✅ Done | |
| IV Rank/Percentile | ⬜ Todo | |
| Historical Volatility | ⬜ Todo | |
| Covered Call Strategy | ✅ Done | Detection & margin calc |
| Cash-Secured Put Strategy | ✅ Done | |
| Vertical Spreads | ⬜ Todo | |
| Iron Condors | ⬜ Todo | |
| Straddles | ⬜ Todo | |
| Strangles | ⬜ Todo | |
| Options P&L Calculator | ⬜ Todo | Visualize at expiration |
| Option Payoff Diagram | ⬜ Todo | |
| Exercise Options | ⬜ Todo | Framework exists |
| Assignment Handling | ⬜ Todo | Framework exists |
| Rollover Tools | ⬜ Todo | |
| Portfolio Greeks | ✅ Done | Aggregated delta/gamma/theta/vega/rho |
| Greeks Sensitivity Analysis | ✅ Done | |

---

## 7. Alerts & Notifications

| Feature | Status | Notes |
|---------|--------|-------|
| Price Alerts | ⬜ Todo | High priority |
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

## 8. News & Research

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

## 9. Social & Community Features

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

## 10. User Experience Enhancements

| Feature | Status | Notes |
|---------|--------|-------|
| Dark Mode | ⬜ Todo | |
| Light Mode Toggle | ⬜ Todo | |
| Mobile Responsive | ⬜ Todo | Currently desktop-focused |
| Keyboard Shortcuts | ⬜ Todo | |
| Widget Dashboard | ⬜ Todo | Draggable layout |
| Quick Trade Widget | ⬜ Todo | Floating panel |
| Recent Symbols | ⬜ Todo | |
| Search Autocomplete | ⬜ Todo | Symbol + company name |
| Onboarding Tutorial | ⬜ Todo | |

---

## 11. Account & Security

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

## 12. Paper Trading Specific

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
| Short Selling (Equity) | ⬜ Todo | Currently options only |
| Fractional Shares | ⬜ Todo | |

---

## 13. Advanced Features (Power Users)

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

## 14. Mobile App (Native)

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

## Priority Implementation Order

### Phase 1 - High Priority (Next Up)
1. ⬜ Price Alerts & Notifications
2. ⬜ Short Equity Selling
3. ⬜ Technical Indicators (RSI, MACD, Bollinger Bands)
4. ⬜ IOC/FOK Time-in-Force
5. ⬜ Chart Drawing Tools (Trend lines, S/R)
6. ⬜ Dark Mode

### Phase 2 - Medium Priority
7. ⬜ Advanced Options Strategies (Spreads, Iron Condors)
8. ⬜ Option Assignment Automation
9. ⬜ CSV/PDF Export
10. ⬜ Mobile-Responsive Design
11. ⬜ Account Reset Feature
12. ⬜ News Feed Integration

### Phase 3 - Social & Engagement
13. ⬜ Leaderboards
14. ⬜ Trading Journal
15. ⬜ Keyboard Shortcuts
16. ⬜ Earnings Calendar
17. ⬜ Public Profiles

### Phase 4 - Advanced
18. ⬜ Level 2 Data
19. ⬜ API Access
20. ⬜ 2FA Authentication
21. ⬜ Mobile Apps
22. ⬜ Copy Trading

---

## Summary

| Category | Done | Todo | Total |
|----------|------|------|-------|
| Order Types | 11 | 0 | 11 |
| Charting | 6 | 13 | 19 |
| Watchlists | 5 | 5 | 10 |
| Real-Time Data | 4 | 2 | 6 |
| Portfolio Analytics | 12 | 4 | 16 |
| Options Trading | 9 | 9 | 18 |
| Alerts | 0 | 11 | 11 |
| News & Research | 0 | 8 | 8 |
| Social | 0 | 7 | 7 |
| UX Enhancements | 0 | 9 | 9 |
| Account & Security | 0 | 7 | 7 |
| Paper Trading | 0 | 10 | 10 |
| Advanced Features | 0 | 9 | 9 |
| Mobile App | 0 | 7 | 7 |
| **TOTAL** | **47** | **101** | **148** |

**Progress: 32% Complete**
