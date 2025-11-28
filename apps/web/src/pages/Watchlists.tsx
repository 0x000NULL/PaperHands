import type { CSSProperties } from 'react';
import { Layout } from '../components/Layout';
import { theme } from '../theme/constants';
import { WatchlistManager } from '../components/watchlist/WatchlistManager';
import { ScreenerPanel } from '../components/screener/ScreenerPanel';
import { PerformanceHeatMap } from '../components/heatmap/PerformanceHeatMap';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
    minHeight: 'calc(100vh - 80px)',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: theme.spacing.lg,
    flex: 1,
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.lg,
  },
};

export function Watchlists() {
  return (
    <Layout>
      <div style={styles.container}>
        <div style={styles.mainGrid}>
          <div style={styles.leftColumn}>
            <WatchlistManager />
          </div>
          <div style={styles.rightColumn}>
            <ScreenerPanel />
            <PerformanceHeatMap />
          </div>
        </div>
      </div>
    </Layout>
  );
}
