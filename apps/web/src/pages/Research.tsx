import { useState, type CSSProperties } from 'react';
import { Layout } from '../components/Layout';
import { Widget } from '../components/dashboard/Widget';
import { theme } from '../theme/constants';
import {
  useMarketNews,
  useCompanyNews,
  useEarningsCalendar,
  useEconomicCalendar,
  useAnalystRatings,
  useSecFilings,
  useInsiderTransactions,
  useCompanyFundamentals,
  useChartTheme,
} from '../hooks';
import type {
  NewsItem,
  EarningsRelease,
  EconomicEvent,
  SecFiling,
} from '../types';

type TabType = 'news' | 'earnings' | 'economic' | 'analyst' | 'filings' | 'insider';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
    minHeight: 'calc(100vh - 80px)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography['2xl'],
    fontWeight: theme.typography.bold,
    color: theme.colors.textPrimary,
    margin: 0,
  },
  symbolInput: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: theme.colors.bgSecondary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.base,
    width: '200px',
    outline: 'none',
  },
  tabs: {
    display: 'flex',
    gap: theme.spacing.xs,
    borderBottom: `1px solid ${theme.colors.border}`,
    paddingBottom: theme.spacing.sm,
  },
  tab: {
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: theme.radius.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  tabActive: {
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing.lg,
  },
  fullWidth: {
    gridColumn: '1 / -1',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    padding: theme.spacing.sm,
    textAlign: 'left' as const,
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.semibold,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  td: {
    padding: theme.spacing.sm,
    fontSize: theme.typography.sm,
    color: theme.colors.textPrimary,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  link: {
    color: theme.colors.accent,
    textDecoration: 'none',
  },
  newsCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
  },
  newsHeadline: {
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  newsMeta: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
  },
  badge: {
    display: 'inline-block',
    padding: `2px ${theme.spacing.xs}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
  },
  badgeHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: theme.colors.negative,
  },
  badgeMedium: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    color: theme.colors.warning,
  },
  badgeLow: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: theme.colors.positive,
  },
  positive: {
    color: theme.colors.positive,
  },
  negative: {
    color: theme.colors.negative,
  },
  statCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
    textAlign: 'center' as const,
  },
  statLabel: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  statValue: {
    fontSize: theme.typography.xl,
    fontWeight: theme.typography.bold,
    fontFamily: theme.typography.fontMono,
  },
  ratingBar: {
    display: 'flex',
    height: '24px',
    borderRadius: theme.radius.sm,
    overflow: 'hidden',
    marginTop: theme.spacing.sm,
  },
  ratingSegment: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: theme.typography.xs,
    color: 'white',
    fontWeight: theme.typography.semibold,
  },
  noData: {
    textAlign: 'center' as const,
    padding: theme.spacing.xl,
    color: theme.colors.textSecondary,
  },
  loading: {
    textAlign: 'center' as const,
    padding: theme.spacing.xl,
    color: theme.colors.textSecondary,
  },
  symbolRequired: {
    textAlign: 'center' as const,
    padding: theme.spacing.xl,
    color: theme.colors.textSecondary,
  },
};

const tabs: { id: TabType; label: string; requiresSymbol: boolean }[] = [
  { id: 'news', label: 'News', requiresSymbol: false },
  { id: 'earnings', label: 'Earnings', requiresSymbol: false },
  { id: 'economic', label: 'Economic', requiresSymbol: false },
  { id: 'analyst', label: 'Analyst', requiresSymbol: true },
  { id: 'filings', label: 'SEC Filings', requiresSymbol: true },
  { id: 'insider', label: 'Insider', requiresSymbol: true },
];

function formatDateTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCurrency(value: number | null): string {
  if (value === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number | null, decimals = 2): string {
  if (value === null) return '-';
  return value.toFixed(decimals);
}

function formatLargeNumber(value: number | null): string {
  if (value === null) return '-';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return formatCurrency(value);
}

function formatPercent(value: number | null): string {
  if (value === null) return '-';
  return `${(value * 100).toFixed(2)}%`;
}

// News Tab Component
function NewsTab({ symbol }: { symbol: string }) {
  const { data: marketNews, isLoading: marketLoading } = useMarketNews('general', 15);
  const { data: companyNews, isLoading: companyLoading } = useCompanyNews(symbol || null);

  return (
    <div style={styles.grid}>
      <Widget title="Market News">
        {marketLoading ? (
          <div style={styles.loading}>Loading...</div>
        ) : !marketNews?.length ? (
          <div style={styles.noData}>No market news available</div>
        ) : (
          marketNews.slice(0, 10).map((item: NewsItem) => (
            <div key={item.id} style={styles.newsCard}>
              <a href={item.url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                <div style={styles.newsHeadline}>{item.headline}</div>
              </a>
              <div style={styles.newsMeta}>
                {item.source} · {formatDateTime(item.datetime)}
              </div>
            </div>
          ))
        )}
      </Widget>
      <Widget title={symbol ? `${symbol} News` : 'Company News'}>
        {!symbol ? (
          <div style={styles.symbolRequired}>Enter a symbol above to see company news</div>
        ) : companyLoading ? (
          <div style={styles.loading}>Loading...</div>
        ) : !companyNews?.length ? (
          <div style={styles.noData}>No news for {symbol}</div>
        ) : (
          companyNews.slice(0, 10).map((item: NewsItem) => (
            <div key={item.id} style={styles.newsCard}>
              <a href={item.url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                <div style={styles.newsHeadline}>{item.headline}</div>
              </a>
              <div style={styles.newsMeta}>
                {item.source} · {formatDateTime(item.datetime)}
              </div>
            </div>
          ))
        )}
      </Widget>
    </div>
  );
}

// Earnings Tab Component
function EarningsTab() {
  const { data: earnings, isLoading } = useEarningsCalendar();

  if (isLoading) return <div style={styles.loading}>Loading earnings calendar...</div>;
  if (!earnings?.length) return <div style={styles.noData}>No upcoming earnings</div>;

  return (
    <Widget title="Upcoming Earnings">
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Symbol</th>
            <th style={styles.th}>Date</th>
            <th style={styles.th}>Time</th>
            <th style={styles.th}>EPS Est.</th>
            <th style={styles.th}>Revenue Est.</th>
            <th style={styles.th}>Quarter</th>
          </tr>
        </thead>
        <tbody>
          {earnings.slice(0, 50).map((item: EarningsRelease, idx: number) => (
            <tr key={`${item.symbol}-${item.date}-${idx}`}>
              <td style={{ ...styles.td, fontWeight: theme.typography.semibold }}>{item.symbol}</td>
              <td style={styles.td}>{item.date}</td>
              <td style={styles.td}>
                {item.hour === 'bmo' ? 'Before Open' : item.hour === 'amc' ? 'After Close' : item.hour}
              </td>
              <td style={styles.td}>{item.epsEstimate !== null ? `$${item.epsEstimate.toFixed(2)}` : '-'}</td>
              <td style={styles.td}>{item.revenueEstimate !== null ? formatLargeNumber(item.revenueEstimate) : '-'}</td>
              <td style={styles.td}>Q{item.quarter} {item.year}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Widget>
  );
}

// Economic Calendar Tab Component
function EconomicTab() {
  const { data: events, isLoading } = useEconomicCalendar();

  if (isLoading) return <div style={styles.loading}>Loading economic calendar...</div>;
  if (!events?.length) return <div style={styles.noData}>No upcoming economic events</div>;

  const getImpactBadge = (impact: string) => {
    const impactLower = impact.toLowerCase();
    if (impactLower === 'high') return { ...styles.badge, ...styles.badgeHigh };
    if (impactLower === 'medium') return { ...styles.badge, ...styles.badgeMedium };
    return { ...styles.badge, ...styles.badgeLow };
  };

  return (
    <Widget title="Economic Calendar">
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Event</th>
            <th style={styles.th}>Country</th>
            <th style={styles.th}>Time</th>
            <th style={styles.th}>Impact</th>
            <th style={styles.th}>Actual</th>
            <th style={styles.th}>Estimate</th>
            <th style={styles.th}>Previous</th>
          </tr>
        </thead>
        <tbody>
          {events.slice(0, 50).map((item: EconomicEvent, idx: number) => (
            <tr key={`${item.event}-${item.time}-${idx}`}>
              <td style={{ ...styles.td, maxWidth: '300px' }}>{item.event}</td>
              <td style={styles.td}>{item.country}</td>
              <td style={styles.td}>{item.time}</td>
              <td style={styles.td}>
                <span style={getImpactBadge(item.impact)}>{item.impact}</span>
              </td>
              <td style={styles.td}>{item.actual !== null ? item.actual : '-'}</td>
              <td style={styles.td}>{item.estimate !== null ? item.estimate : '-'}</td>
              <td style={styles.td}>{item.previous !== null ? item.previous : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Widget>
  );
}

// Analyst Ratings Tab Component
function AnalystTab({ symbol }: { symbol: string }) {
  const { data: ratings, isLoading } = useAnalystRatings(symbol || null);
  const { data: fundamentals } = useCompanyFundamentals(symbol || null);
  const chartColors = useChartTheme();

  if (!symbol) return <div style={styles.symbolRequired}>Enter a symbol above to see analyst ratings</div>;
  if (isLoading) return <div style={styles.loading}>Loading analyst data...</div>;
  if (!ratings) return <div style={styles.noData}>No analyst data for {symbol}</div>;

  const latestRec = ratings.recommendations[0];
  const total = latestRec
    ? latestRec.strongBuy + latestRec.buy + latestRec.hold + latestRec.sell + latestRec.strongSell
    : 0;

  const getConsensusColor = (rating: string) => {
    if (rating.includes('Buy')) return theme.colors.positive;
    if (rating.includes('Sell')) return theme.colors.negative;
    return theme.colors.textSecondary;
  };

  return (
    <div style={styles.grid}>
      <Widget title="Analyst Consensus">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: theme.spacing.md }}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Consensus</div>
            <div style={{ ...styles.statValue, color: getConsensusColor(ratings.consensusRating) }}>
              {ratings.consensusRating}
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Analysts</div>
            <div style={styles.statValue}>{ratings.totalAnalysts}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Price Target</div>
            <div style={styles.statValue}>
              {ratings.priceTarget ? formatCurrency(ratings.priceTarget.targetMean) : '-'}
            </div>
          </div>
        </div>
        {latestRec && total > 0 && (
          <div style={styles.ratingBar}>
            {latestRec.strongBuy > 0 && (
              <div style={{ ...styles.ratingSegment, flex: latestRec.strongBuy, backgroundColor: chartColors.gaugeVeryLow }}>
                {latestRec.strongBuy}
              </div>
            )}
            {latestRec.buy > 0 && (
              <div style={{ ...styles.ratingSegment, flex: latestRec.buy, backgroundColor: chartColors.gaugeLow }}>
                {latestRec.buy}
              </div>
            )}
            {latestRec.hold > 0 && (
              <div style={{ ...styles.ratingSegment, flex: latestRec.hold, backgroundColor: chartColors.gaugeNeutral }}>
                {latestRec.hold}
              </div>
            )}
            {latestRec.sell > 0 && (
              <div style={{ ...styles.ratingSegment, flex: latestRec.sell, backgroundColor: chartColors.gaugeHigh }}>
                {latestRec.sell}
              </div>
            )}
            {latestRec.strongSell > 0 && (
              <div style={{ ...styles.ratingSegment, flex: latestRec.strongSell, backgroundColor: chartColors.gaugeVeryHigh }}>
                {latestRec.strongSell}
              </div>
            )}
          </div>
        )}
        {ratings.priceTarget && (
          <div style={{ marginTop: theme.spacing.lg }}>
            <div style={styles.statLabel}>Price Target Range</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: theme.spacing.sm }}>
              <span>Low: {formatCurrency(ratings.priceTarget.targetLow)}</span>
              <span>Median: {formatCurrency(ratings.priceTarget.targetMedian)}</span>
              <span>High: {formatCurrency(ratings.priceTarget.targetHigh)}</span>
            </div>
          </div>
        )}
      </Widget>
      <Widget title="Company Fundamentals">
        {fundamentals ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.spacing.sm }}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Market Cap</div>
              <div style={styles.statValue}>{formatLargeNumber(fundamentals.marketCap * 1e6)}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>P/E Ratio</div>
              <div style={styles.statValue}>{formatNumber(fundamentals.peRatio)}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>EPS</div>
              <div style={styles.statValue}>{formatCurrency(fundamentals.eps)}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Dividend Yield</div>
              <div style={styles.statValue}>{formatPercent(fundamentals.dividendYield ? fundamentals.dividendYield / 100 : null)}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Beta</div>
              <div style={styles.statValue}>{formatNumber(fundamentals.beta)}</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>52W Range</div>
              <div style={{ fontSize: theme.typography.sm }}>
                {formatCurrency(fundamentals.week52Low)} - {formatCurrency(fundamentals.week52High)}
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.noData}>Loading fundamentals...</div>
        )}
      </Widget>
    </div>
  );
}

// SEC Filings Tab Component
function FilingsTab({ symbol }: { symbol: string }) {
  const { data: filings, isLoading } = useSecFilings(symbol || null);

  if (!symbol) return <div style={styles.symbolRequired}>Enter a symbol above to see SEC filings</div>;
  if (isLoading) return <div style={styles.loading}>Loading SEC filings...</div>;
  if (!filings?.length) return <div style={styles.noData}>No filings found for {symbol}</div>;

  return (
    <Widget title={`SEC Filings - ${symbol}`}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Form</th>
            <th style={styles.th}>Filed Date</th>
            <th style={styles.th}>Accepted Date</th>
            <th style={styles.th}>Links</th>
          </tr>
        </thead>
        <tbody>
          {filings.slice(0, 30).map((filing: SecFiling) => (
            <tr key={filing.accessNumber}>
              <td style={{ ...styles.td, fontWeight: theme.typography.semibold }}>{filing.form}</td>
              <td style={styles.td}>{filing.filedDate}</td>
              <td style={styles.td}>{filing.acceptedDate}</td>
              <td style={styles.td}>
                <a href={filing.filingUrl} target="_blank" rel="noopener noreferrer" style={styles.link}>
                  Filing
                </a>
                {filing.reportUrl && (
                  <>
                    {' · '}
                    <a href={filing.reportUrl} target="_blank" rel="noopener noreferrer" style={styles.link}>
                      Report
                    </a>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Widget>
  );
}

// Insider Trading Tab Component
function InsiderTab({ symbol }: { symbol: string }) {
  const { data: insider, isLoading } = useInsiderTransactions(symbol || null);

  if (!symbol) return <div style={styles.symbolRequired}>Enter a symbol above to see insider transactions</div>;
  if (isLoading) return <div style={styles.loading}>Loading insider data...</div>;
  if (!insider?.transactions?.length) return <div style={styles.noData}>No insider transactions for {symbol}</div>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Net Change (shares)</div>
          <div style={{ ...styles.statValue, color: insider.netChange >= 0 ? theme.colors.positive : theme.colors.negative }}>
            {insider.netChange >= 0 ? '+' : ''}{insider.netChange.toLocaleString()}
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Buys</div>
          <div style={{ ...styles.statValue, color: theme.colors.positive }}>{insider.totalBuys}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Sells</div>
          <div style={{ ...styles.statValue, color: theme.colors.negative }}>{insider.totalSells}</div>
        </div>
      </div>
      <Widget title="Recent Transactions">
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Transaction</th>
              <th style={styles.th}>Shares</th>
              <th style={styles.th}>Price</th>
              <th style={styles.th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {insider.transactions.slice(0, 30).map((tx, idx) => (
              <tr key={`${tx.name}-${tx.transactionDate}-${idx}`}>
                <td style={styles.td}>{tx.name}</td>
                <td style={styles.td}>
                  <span style={tx.change >= 0 ? styles.positive : styles.negative}>
                    {tx.change >= 0 ? 'Buy' : 'Sell'}
                  </span>
                </td>
                <td style={styles.td}>{Math.abs(tx.change).toLocaleString()}</td>
                <td style={styles.td}>{tx.transactionPrice ? formatCurrency(tx.transactionPrice) : '-'}</td>
                <td style={styles.td}>{tx.transactionDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Widget>
    </div>
  );
}

export function Research() {
  const [activeTab, setActiveTab] = useState<TabType>('news');
  const [symbol, setSymbol] = useState('');

  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSymbol(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''));
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'news':
        return <NewsTab symbol={symbol} />;
      case 'earnings':
        return <EarningsTab />;
      case 'economic':
        return <EconomicTab />;
      case 'analyst':
        return <AnalystTab symbol={symbol} />;
      case 'filings':
        return <FilingsTab symbol={symbol} />;
      case 'insider':
        return <InsiderTab symbol={symbol} />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>Research</h1>
          <input
            type="text"
            value={symbol}
            onChange={handleSymbolChange}
            placeholder="Enter symbol (e.g., AAPL)"
            style={styles.symbolInput}
            maxLength={5}
          />
        </div>

        <div style={styles.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              {tab.requiresSymbol && !symbol && ' *'}
            </button>
          ))}
        </div>

        {renderTab()}
      </div>
    </Layout>
  );
}

export default Research;
