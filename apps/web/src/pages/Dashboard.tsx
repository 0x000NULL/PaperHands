import type { CSSProperties } from 'react';
import { Layout } from '../components/Layout';
import { theme } from '../theme/constants';
import {
  PortfolioSummary,
  PositionsTable,
  QuotePanel,
  TradeForm,
  OrderHistory,
  ChartPanel,
} from '../components/dashboard';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
    minHeight: 'calc(100vh - 80px)',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr 1fr',
    gap: theme.spacing.lg,
    flex: 1,
  },
  positionsColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  quoteColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  tradeColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  bottomSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  chartSection: {
    display: 'flex',
    flexDirection: 'column',
  },
};

// Responsive styles handled via CSS media query simulation
const getResponsiveStyles = (): Record<string, CSSProperties> => {
  // For now, we'll use fixed desktop layout
  // In production, you'd use a useMediaQuery hook
  return styles;
};

export function Dashboard() {
  const responsiveStyles = getResponsiveStyles();

  return (
    <Layout>
      <div style={responsiveStyles.container}>
        {/* Portfolio Summary Bar */}
        <PortfolioSummary />

        {/* Main 3-Column Grid */}
        <div style={responsiveStyles.mainGrid}>
          {/* Left Column - Positions */}
          <div style={responsiveStyles.positionsColumn}>
            <PositionsTable />
          </div>

          {/* Middle Column - Quote */}
          <div style={responsiveStyles.quoteColumn}>
            <QuotePanel />
          </div>

          {/* Right Column - Trade Form */}
          <div style={responsiveStyles.tradeColumn}>
            <TradeForm />
          </div>
        </div>

        {/* Chart Section */}
        <div style={responsiveStyles.chartSection}>
          <ChartPanel />
        </div>

        {/* Bottom - Order History */}
        <div style={responsiveStyles.bottomSection}>
          <OrderHistory />
        </div>
      </div>
    </Layout>
  );
}
