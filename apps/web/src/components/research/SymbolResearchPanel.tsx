import { type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Widget } from '../dashboard/Widget';
import { theme } from '../../theme/constants';
import {
  useCompanyNews,
  useAnalystRatings,
  useInsiderTransactions,
} from '../../hooks';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  section: {
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.semibold,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase' as const,
  },
  newsItem: {
    fontSize: theme.typography.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  link: {
    color: theme.colors.accent,
    textDecoration: 'none',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: theme.typography.sm,
    padding: `${theme.spacing.xs} 0`,
  },
  statLabel: {
    color: theme.colors.textSecondary,
  },
  statValue: {
    fontWeight: theme.typography.semibold,
    fontFamily: theme.typography.fontMono,
  },
  positive: {
    color: theme.colors.profit,
  },
  negative: {
    color: theme.colors.loss,
  },
  noData: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  viewMore: {
    display: 'block',
    textAlign: 'center' as const,
    fontSize: theme.typography.sm,
    color: theme.colors.accent,
    textDecoration: 'none',
    marginTop: theme.spacing.sm,
    padding: theme.spacing.xs,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.sm,
  },
  ratingBadge: {
    display: 'inline-block',
    padding: `2px ${theme.spacing.xs}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
  },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface SymbolResearchPanelProps {
  symbol: string;
}

export function SymbolResearchPanel({ symbol }: SymbolResearchPanelProps) {
  const { data: news } = useCompanyNews(symbol);
  const { data: ratings } = useAnalystRatings(symbol);
  const { data: insider } = useInsiderTransactions(symbol);

  if (!symbol) {
    return null;
  }

  const getConsensusColor = (rating: string) => {
    if (rating.includes('Buy')) return theme.colors.profit;
    if (rating.includes('Sell')) return theme.colors.loss;
    return theme.colors.textSecondary;
  };

  return (
    <Widget
      title={`${symbol} Research`}
      headerAction={
        <Link to="/research" style={styles.link}>
          Full Research
        </Link>
      }
    >
      <div style={styles.container}>
        {/* Recent News */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Latest News</div>
          {news && news.length > 0 ? (
            news.slice(0, 3).map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ ...styles.newsItem, ...styles.link, display: 'block' }}
              >
                {item.headline}
              </a>
            ))
          ) : (
            <div style={styles.noData}>No recent news</div>
          )}
        </div>

        {/* Analyst Ratings */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Analyst Ratings</div>
          {ratings ? (
            <>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Consensus</span>
                <span
                  style={{
                    ...styles.ratingBadge,
                    backgroundColor: `${getConsensusColor(ratings.consensusRating)}20`,
                    color: getConsensusColor(ratings.consensusRating),
                  }}
                >
                  {ratings.consensusRating}
                </span>
              </div>
              {ratings.priceTarget && (
                <div style={styles.statRow}>
                  <span style={styles.statLabel}>Price Target</span>
                  <span style={styles.statValue}>
                    {formatCurrency(ratings.priceTarget.targetMean)}
                  </span>
                </div>
              )}
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Analysts</span>
                <span style={styles.statValue}>{ratings.totalAnalysts}</span>
              </div>
            </>
          ) : (
            <div style={styles.noData}>No analyst data</div>
          )}
        </div>

        {/* Insider Activity */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Insider Activity</div>
          {insider && insider.transactions.length > 0 ? (
            <>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Net Change</span>
                <span
                  style={{
                    ...styles.statValue,
                    color: insider.netChange >= 0 ? theme.colors.profit : theme.colors.loss,
                  }}
                >
                  {insider.netChange >= 0 ? '+' : ''}
                  {insider.netChange.toLocaleString()} shares
                </span>
              </div>
              <div style={styles.statRow}>
                <span style={styles.statLabel}>Recent Activity</span>
                <span style={styles.statValue}>
                  <span style={styles.positive}>{insider.totalBuys} buys</span>
                  {' / '}
                  <span style={styles.negative}>{insider.totalSells} sells</span>
                </span>
              </div>
            </>
          ) : (
            <div style={styles.noData}>No insider activity</div>
          )}
        </div>

        <Link to="/research" style={styles.viewMore}>
          View Full Research
        </Link>
      </div>
    </Widget>
  );
}

export default SymbolResearchPanel;
