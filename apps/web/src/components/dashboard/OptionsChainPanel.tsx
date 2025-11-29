import { useState, useMemo, type CSSProperties } from 'react';
import { Widget } from './Widget';
import { ExpirationTabs } from './ExpirationTabs';
import { OptionsChainTable } from './OptionsChainTable';
import { OptionDetailModal } from './OptionDetailModal';
import { useOptionsExpirations, useOptionsChain } from '../../hooks';
import { useDashboardStore } from '../../store/dashboardStore';
import { theme } from '../../theme/constants';
import type { OptionContract } from '../../types';

const styles: Record<string, CSSProperties> = {
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    minHeight: 200,
  },
  emptyIcon: {
    fontSize: '2rem',
    marginBottom: theme.spacing.md,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: theme.typography.sm,
    margin: 0,
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    minHeight: 200,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    minHeight: 200,
    color: theme.colors.negative,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: theme.spacing.md,
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    backgroundColor: 'transparent',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    cursor: 'pointer',
  },
  underlyingPrice: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
  },
  priceValue: {
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontMono,
    fontWeight: theme.typography.semibold,
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  skeletonTabs: {
    display: 'flex',
    gap: theme.spacing.xs,
  },
  skeletonTab: {
    width: 60,
    height: 28,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.sm,
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};

// Track expiration selection per symbol
interface ExpirationSelection {
  symbol: string;
  expiration: string;
}

export function OptionsChainPanel() {
  const selectedSymbol = useDashboardStore((s) => s.selectedSymbol);
  const prefillBuy = useDashboardStore((s) => s.prefillBuy);
  const prefillSell = useDashboardStore((s) => s.prefillSell);

  // Track user-selected expiration with the symbol it belongs to
  const [expirationSelection, setExpirationSelection] = useState<ExpirationSelection | null>(null);
  const [selectedContract, setSelectedContract] = useState<OptionContract | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch expirations for the selected symbol
  const {
    data: expirations,
    isLoading: isLoadingExpirations,
    error: expirationsError,
    refetch: refetchExpirations,
  } = useOptionsExpirations(selectedSymbol);

  // Derive the effective expiration:
  // - Use user selection only if it's for the current symbol and still valid
  // - Otherwise fall back to first available expiration
  const selectedExpiration = useMemo(() => {
    // Check if user selection is valid for current symbol
    if (
      expirationSelection &&
      expirationSelection.symbol === selectedSymbol &&
      expirations?.includes(expirationSelection.expiration)
    ) {
      return expirationSelection.expiration;
    }

    // Fall back to first expiration
    return expirations?.[0] ?? null;
  }, [selectedSymbol, expirationSelection, expirations]);

  // Handler for user changing expiration - stores selection with symbol
  const handleExpirationChange = (expiration: string) => {
    if (selectedSymbol) {
      setExpirationSelection({ symbol: selectedSymbol, expiration });
    }
  };

  // Fetch options chain for the selected expiration
  const {
    data: chain,
    isLoading: isLoadingChain,
    error: chainError,
    refetch: refetchChain,
  } = useOptionsChain(selectedSymbol, selectedExpiration);

  const handleSelectContract = (contract: OptionContract) => {
    setSelectedContract(contract);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedContract(null);
  };

  const handleTrade = (contract: OptionContract, side: 'buy' | 'sell') => {
    // For now, we'll use the underlying symbol since options trading isn't fully supported
    // In the future, this would prefill with the option contract symbol
    if (side === 'buy') {
      prefillBuy(contract.symbol);
    } else {
      prefillSell(contract.symbol, 1);
    }
    handleCloseModal();
  };

  // Render expiration tabs or skeleton
  const renderHeaderAction = () => {
    if (!selectedSymbol) return null;

    if (isLoadingExpirations) {
      return (
        <div style={styles.skeletonTabs}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={styles.skeletonTab} />
          ))}
        </div>
      );
    }

    if (expirations && expirations.length > 0 && selectedExpiration) {
      return (
        <div style={styles.headerContent}>
          {chain && (
            <div style={styles.underlyingPrice}>
              <span>Underlying:</span>
              <span style={styles.priceValue}>
                ${chain.underlyingPrice.toFixed(2)}
              </span>
            </div>
          )}
          <ExpirationTabs
            expirations={expirations}
            selected={selectedExpiration}
            onChange={handleExpirationChange}
          />
        </div>
      );
    }

    return null;
  };

  // Render body content
  const renderContent = () => {
    // No symbol selected
    if (!selectedSymbol) {
      return (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📊</div>
          <p style={styles.emptyText}>Select a symbol to view options chain</p>
        </div>
      );
    }

    // Loading expirations
    if (isLoadingExpirations) {
      return (
        <div style={styles.loadingContainer}>
          Loading options expirations...
        </div>
      );
    }

    // Error loading expirations
    if (expirationsError) {
      return (
        <div style={styles.errorContainer}>
          <p>Options not available for {selectedSymbol}</p>
          <button
            style={styles.retryButton}
            onClick={() => refetchExpirations()}
          >
            Retry
          </button>
        </div>
      );
    }

    // No expirations available
    if (!expirations || expirations.length === 0) {
      return (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>
            No options available for {selectedSymbol}
          </p>
        </div>
      );
    }

    // Loading chain
    if (isLoadingChain) {
      return (
        <div style={styles.loadingContainer}>
          Loading options chain...
        </div>
      );
    }

    // Error loading chain
    if (chainError) {
      return (
        <div style={styles.errorContainer}>
          <p>Failed to load options chain</p>
          <button
            style={styles.retryButton}
            onClick={() => refetchChain()}
          >
            Retry
          </button>
        </div>
      );
    }

    // Render chain table
    if (chain) {
      return (
        <OptionsChainTable
          chain={chain}
          onSelectContract={handleSelectContract}
        />
      );
    }

    return null;
  };

  return (
    <>
      <Widget
        title="Options Chain"
        headerAction={renderHeaderAction()}
        noPadding
      >
        {renderContent()}
      </Widget>

      <OptionDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        contract={selectedContract}
        onTrade={handleTrade}
      />
    </>
  );
}
