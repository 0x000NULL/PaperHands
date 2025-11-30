import { useState, useMemo, type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { Widget } from './Widget';

interface OptionsPnLCalculatorProps {
  initialStrike?: number;
  initialPremium?: number;
  initialType?: 'call' | 'put';
  underlyingPrice?: number;
}

interface PnLScenario {
  price: number;
  pnl: number;
  pnlPercent: number;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  inputGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: theme.spacing.md,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.bgInput,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    fontFamily: theme.typography.fontMono,
    width: '100%',
    boxSizing: 'border-box',
  },
  select: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.bgInput,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    width: '100%',
    cursor: 'pointer',
  },
  typeButtons: {
    display: 'flex',
    gap: theme.spacing.sm,
  },
  typeButton: {
    flex: 1,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.border}`,
    backgroundColor: 'transparent',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  typeButtonActive: {
    borderColor: theme.colors.accent,
    color: theme.colors.accent,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  sideButtons: {
    display: 'flex',
    gap: theme.spacing.sm,
  },
  sideButton: {
    flex: 1,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.border}`,
    backgroundColor: 'transparent',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.medium,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  longActive: {
    borderColor: theme.colors.positive,
    color: theme.colors.positive,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  shortActive: {
    borderColor: theme.colors.negative,
    color: theme.colors.negative,
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
  },
  resultsSection: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
  },
  sectionTitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: theme.spacing.md,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  metric: {
    textAlign: 'center',
  },
  metricLabel: {
    color: theme.colors.textTertiary,
    fontSize: theme.typography.xs,
    marginBottom: theme.spacing.xs,
  },
  metricValue: {
    fontSize: theme.typography.base,
    fontWeight: theme.typography.semibold,
    fontFamily: theme.typography.fontMono,
  },
  positive: {
    color: theme.colors.positive,
  },
  negative: {
    color: theme.colors.negative,
  },
  neutral: {
    color: theme.colors.textPrimary,
  },
  unlimited: {
    color: theme.colors.warning,
  },
  scenariosTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: theme.spacing.md,
  },
  tableHeader: {
    backgroundColor: theme.colors.bgPrimary,
  },
  th: {
    padding: theme.spacing.sm,
    textAlign: 'left',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    textTransform: 'uppercase',
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  td: {
    padding: theme.spacing.sm,
    fontSize: theme.typography.sm,
    fontFamily: theme.typography.fontMono,
    color: theme.colors.textPrimary,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  breakEvenRow: {
    backgroundColor: 'rgba(255, 165, 2, 0.1)',
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

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function OptionsPnLCalculator({
  initialStrike = 100,
  initialPremium = 2.5,
  initialType = 'call',
  underlyingPrice = 100,
}: OptionsPnLCalculatorProps) {
  const [optionType, setOptionType] = useState<'call' | 'put'>(initialType);
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [strike, setStrike] = useState(initialStrike);
  const [premium, setPremium] = useState(initialPremium);
  const [contracts, setContracts] = useState(1);
  const [currentPrice, setCurrentPrice] = useState(underlyingPrice);

  // Calculate key metrics
  const calculations = useMemo(() => {
    const multiplier = 100; // Standard option contract multiplier
    const totalPremium = premium * contracts * multiplier;
    const isLong = side === 'long';
    const isCall = optionType === 'call';

    // Break-even calculation
    let breakEven: number;
    if (isCall) {
      breakEven = isLong ? strike + premium : strike + premium;
    } else {
      breakEven = isLong ? strike - premium : strike - premium;
    }

    // Max profit/loss calculation
    let maxProfit: number | 'unlimited';
    let maxLoss: number | 'unlimited';

    if (isLong) {
      // Long options
      if (isCall) {
        maxProfit = 'unlimited';
        maxLoss = totalPremium;
      } else {
        maxProfit = (strike - premium) * contracts * multiplier;
        maxLoss = totalPremium;
      }
    } else {
      // Short options
      if (isCall) {
        maxProfit = totalPremium;
        maxLoss = 'unlimited';
      } else {
        maxProfit = totalPremium;
        maxLoss = (strike - premium) * contracts * multiplier;
      }
    }

    // Calculate P&L at current price
    const calculatePnL = (price: number): number => {
      let intrinsicValue: number;
      if (isCall) {
        intrinsicValue = Math.max(0, price - strike);
      } else {
        intrinsicValue = Math.max(0, strike - price);
      }

      const optionValue = intrinsicValue * contracts * multiplier;

      if (isLong) {
        return optionValue - totalPremium;
      } else {
        return totalPremium - optionValue;
      }
    };

    const currentPnL = calculatePnL(currentPrice);
    const currentPnLPercent = (currentPnL / totalPremium) * 100;

    // Generate price scenarios
    const scenarios: PnLScenario[] = [];
    const priceRange = strike * 0.3; // 30% range around strike
    const step = priceRange / 10;

    for (let i = -10; i <= 10; i++) {
      const price = strike + (i * step);
      if (price <= 0) continue;

      const pnl = calculatePnL(price);
      const pnlPercent = (pnl / totalPremium) * 100;

      scenarios.push({
        price: Math.round(price * 100) / 100,
        pnl,
        pnlPercent,
      });
    }

    return {
      breakEven,
      maxProfit,
      maxLoss,
      totalPremium,
      currentPnL,
      currentPnLPercent,
      scenarios,
    };
  }, [optionType, side, strike, premium, contracts, currentPrice]);

  return (
    <Widget title="Options P&L Calculator">
      <div style={styles.container}>
        {/* Option Type Selection */}
        <div style={styles.inputGroup}>
          <span style={styles.label}>Option Type</span>
          <div style={styles.typeButtons}>
            <button
              style={{
                ...styles.typeButton,
                ...(optionType === 'call' ? styles.typeButtonActive : {}),
              }}
              onClick={() => setOptionType('call')}
            >
              CALL
            </button>
            <button
              style={{
                ...styles.typeButton,
                ...(optionType === 'put' ? styles.typeButtonActive : {}),
              }}
              onClick={() => setOptionType('put')}
            >
              PUT
            </button>
          </div>
        </div>

        {/* Side Selection */}
        <div style={styles.inputGroup}>
          <span style={styles.label}>Position</span>
          <div style={styles.sideButtons}>
            <button
              style={{
                ...styles.sideButton,
                ...(side === 'long' ? styles.longActive : {}),
              }}
              onClick={() => setSide('long')}
            >
              LONG (Buy)
            </button>
            <button
              style={{
                ...styles.sideButton,
                ...(side === 'short' ? styles.shortActive : {}),
              }}
              onClick={() => setSide('short')}
            >
              SHORT (Sell)
            </button>
          </div>
        </div>

        {/* Input Fields */}
        <div style={styles.inputGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Strike Price</label>
            <input
              type="number"
              style={styles.input}
              value={strike}
              onChange={(e) => setStrike(parseFloat(e.target.value) || 0)}
              step="0.5"
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Premium (per share)</label>
            <input
              type="number"
              style={styles.input}
              value={premium}
              onChange={(e) => setPremium(parseFloat(e.target.value) || 0)}
              step="0.05"
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Contracts</label>
            <input
              type="number"
              style={styles.input}
              value={contracts}
              onChange={(e) => setContracts(parseInt(e.target.value) || 1)}
              min="1"
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Current Price</label>
            <input
              type="number"
              style={styles.input}
              value={currentPrice}
              onChange={(e) => setCurrentPrice(parseFloat(e.target.value) || 0)}
              step="0.5"
            />
          </div>
        </div>

        {/* Results Section */}
        <div style={styles.resultsSection}>
          <div style={styles.sectionTitle}>Position Analysis</div>

          {/* Key Metrics */}
          <div style={styles.metricsGrid}>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Break Even</div>
              <div style={{ ...styles.metricValue, ...styles.neutral }}>
                {formatCurrency(calculations.breakEven)}
              </div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Max Profit</div>
              <div
                style={{
                  ...styles.metricValue,
                  ...(calculations.maxProfit === 'unlimited'
                    ? styles.unlimited
                    : styles.positive),
                }}
              >
                {calculations.maxProfit === 'unlimited'
                  ? 'Unlimited'
                  : formatCurrency(calculations.maxProfit)}
              </div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Max Loss</div>
              <div
                style={{
                  ...styles.metricValue,
                  ...(calculations.maxLoss === 'unlimited'
                    ? styles.unlimited
                    : styles.negative),
                }}
              >
                {calculations.maxLoss === 'unlimited'
                  ? 'Unlimited'
                  : formatCurrency(calculations.maxLoss)}
              </div>
            </div>
          </div>

          {/* Current P&L */}
          <div style={styles.metricsGrid}>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Total Premium</div>
              <div style={{ ...styles.metricValue, ...styles.neutral }}>
                {formatCurrency(calculations.totalPremium)}
              </div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>Current P&L</div>
              <div
                style={{
                  ...styles.metricValue,
                  ...(calculations.currentPnL >= 0
                    ? styles.positive
                    : styles.negative),
                }}
              >
                {formatCurrency(calculations.currentPnL)}
              </div>
            </div>
            <div style={styles.metric}>
              <div style={styles.metricLabel}>P&L %</div>
              <div
                style={{
                  ...styles.metricValue,
                  ...(calculations.currentPnLPercent >= 0
                    ? styles.positive
                    : styles.negative),
                }}
              >
                {formatPercent(calculations.currentPnLPercent)}
              </div>
            </div>
          </div>

          {/* Price Scenarios Table */}
          <div style={styles.sectionTitle}>Price Scenarios</div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <table style={styles.scenariosTable}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.th}>Underlying</th>
                  <th style={styles.th}>P&L ($)</th>
                  <th style={styles.th}>P&L (%)</th>
                </tr>
              </thead>
              <tbody>
                {calculations.scenarios.map((scenario) => {
                  const isBreakEven =
                    Math.abs(scenario.price - calculations.breakEven) < 0.5;
                  const pnlStyle =
                    scenario.pnl >= 0 ? styles.positive : styles.negative;

                  return (
                    <tr
                      key={scenario.price}
                      style={isBreakEven ? styles.breakEvenRow : undefined}
                    >
                      <td style={styles.td}>{formatCurrency(scenario.price)}</td>
                      <td style={{ ...styles.td, ...pnlStyle }}>
                        {formatCurrency(scenario.pnl)}
                      </td>
                      <td style={{ ...styles.td, ...pnlStyle }}>
                        {formatPercent(scenario.pnlPercent)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Widget>
  );
}
