import type { CSSProperties } from 'react';
import { Layout } from '../components/Layout';
import {
  PortfolioSummary,
  PositionsTable,
  QuotePanel,
  TradeForm,
  OrderHistory,
  ChartPanel,
  OptionsChainPanel,
  ExpirationCalendar,
  IVGauge,
  WatchlistWidget,
  WidgetGrid,
  GridWidget,
  DraggableWidget,
} from '../components/dashboard';
import { PerformanceHeatMap } from '../components/heatmap/PerformanceHeatMap';
import { useDashboardStore } from '../store/dashboardStore';
import { SpotlightTour } from '../components/onboarding';
import { type WidgetId, type WidgetPosition } from '../store/layoutStore';
import { useLayoutSync } from '../hooks/useLayoutSync';
import { QuickTradePanel } from '../components/common/QuickTradePanel';
import { ShortcutsModal } from '../components/common/ShortcutsModal';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 80px)',
    overflow: 'hidden',
  },
};

// Map widget IDs to their components
function renderWidgetContent(widgetId: WidgetId, selectedSymbol: string | null) {
  switch (widgetId) {
    case 'summary':
      return (
        <div data-tour-id="tour-portfolio-summary">
          <PortfolioSummary />
        </div>
      );
    case 'quote':
      return (
        <div data-tour-id="tour-quote-panel">
          <QuotePanel />
        </div>
      );
    case 'chart':
      return <ChartPanel />;
    case 'trade':
      return (
        <div data-tour-id="tour-trade-form">
          <TradeForm />
        </div>
      );
    case 'positions':
      return (
        <div data-tour-id="tour-positions-table">
          <PositionsTable />
        </div>
      );
    case 'orders':
      return <OrderHistory />;
    case 'watchlist':
      return <WatchlistWidget />;
    case 'options':
      return (
        <div data-tour-id="tour-options-chain">
          <OptionsChainPanel />
        </div>
      );
    case 'heatmap':
      return <PerformanceHeatMap />;
    case 'expirations':
      return <ExpirationCalendar />;
    case 'ivGauge':
      return selectedSymbol ? <IVGauge symbol={selectedSymbol} /> : null;
    default:
      return null;
  }
}

export function Dashboard() {
  const selectedSymbol = useDashboardStore((state) => state.selectedSymbol);

  // Initialize layout sync with server
  useLayoutSync();

  return (
    <Layout>
      <div style={styles.container}>
        <WidgetGrid>
          {(visibleWidgets: WidgetPosition[]) => (
            <>
              {visibleWidgets.map((widget) => (
                <GridWidget key={widget.id} widget={widget}>
                  <DraggableWidget id={widget.id}>
                    {renderWidgetContent(widget.id, selectedSymbol)}
                  </DraggableWidget>
                </GridWidget>
              ))}
            </>
          )}
        </WidgetGrid>
      </div>

      {/* Global Modals */}
      <QuickTradePanel />
      <ShortcutsModal />

      {/* Spotlight Tour Overlay */}
      <SpotlightTour />
    </Layout>
  );
}
