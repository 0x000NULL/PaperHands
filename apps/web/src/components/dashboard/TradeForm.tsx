import { useState } from 'react';
import type { CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useQuote, usePlaceOrder, useMarketStatus } from '../../hooks';
import { useDashboardStore } from '../../store/dashboardStore';
import { Widget } from './Widget';
import type { OrderType, TimeInForce } from '../../types';

const styles: Record<string, CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  sideToggle: {
    display: 'flex',
    gap: theme.spacing.sm,
  },
  sideButton: {
    flex: 1,
    padding: theme.spacing.md,
    border: 'none',
    borderRadius: theme.radius.md,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.bold,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  fieldGroup: {
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
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgInput,
    color: theme.colors.textPrimary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    fontSize: theme.typography.base,
    outline: 'none',
    transition: theme.transitions.fast,
  },
  select: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgInput,
    color: theme.colors.textPrimary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    fontSize: theme.typography.base,
    outline: 'none',
    cursor: 'pointer',
  },
  estimate: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
  },
  estimateLabel: {
    color: theme.colors.textSecondary,
  },
  estimateValue: {
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.semibold,
    fontFamily: theme.typography.fontMono,
  },
  submitButton: {
    padding: theme.spacing.md,
    border: 'none',
    borderRadius: theme.radius.md,
    fontSize: theme.typography.base,
    fontWeight: theme.typography.bold,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  success: {
    padding: theme.spacing.md,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    color: theme.colors.positive,
    borderRadius: theme.radius.md,
    textAlign: 'center',
  },
  error: {
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    color: theme.colors.negative,
    borderRadius: theme.radius.md,
    textAlign: 'center',
  },
  empty: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    padding: theme.spacing.xl,
  },
  priceInputs: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing.md,
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  checkboxLabel: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    cursor: 'pointer',
  },
  warning: {
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(255, 200, 0, 0.1)',
    color: theme.colors.warning,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
  },
  tifRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing.md,
  },
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

const orderTypeLabels: Record<OrderType, string> = {
  market: 'Market',
  limit: 'Limit',
  stop: 'Stop',
  stop_limit: 'Stop Limit',
  trailing_stop: 'Trailing Stop',
};

const timeInForceLabels: Record<TimeInForce, string> = {
  day: 'Day',
  gtc: 'GTC',
  ioc: 'IOC',
  fok: 'FOK',
};

const timeInForceDescriptions: Record<TimeInForce, string> = {
  day: 'Expires at market close',
  gtc: 'Good-til-cancelled',
  ioc: 'Immediate or cancel',
  fok: 'Fill or kill',
};

export function TradeForm() {
  const {
    selectedSymbol,
    tradeSide,
    setTradeSide,
    orderType,
    setOrderType,
    timeInForce,
    setTimeInForce,
    extendedHours,
    setExtendedHours,
    quantity,
    setQuantity,
    limitPrice,
    setLimitPrice,
    stopPrice,
    setStopPrice,
    trailAmount,
    setTrailAmount,
    resetTradeForm,
  } = useDashboardStore();

  const [success, setSuccess] = useState('');
  const { data: quote } = useQuote(selectedSymbol ?? '', !!selectedSymbol);
  const { data: marketStatus } = useMarketStatus();
  const placeOrderMutation = usePlaceOrder();

  // Determine if we're in extended hours session
  const isExtendedSession =
    marketStatus?.session === 'pre_market' ||
    marketStatus?.session === 'after_hours';

  // Check if order type is a stop-based order (IOC/FOK not allowed)
  const isStopOrder =
    orderType === 'stop' ||
    orderType === 'stop_limit' ||
    orderType === 'trailing_stop';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');

    if (!quote || !selectedSymbol) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    const orderRequest: Parameters<typeof placeOrderMutation.mutate>[0] = {
      symbol: selectedSymbol,
      side: tradeSide,
      quantity: qty,
      orderType,
      timeInForce,
      extendedHours,
    };

    // Add price fields based on order type
    if (orderType === 'limit' || orderType === 'stop_limit') {
      const limit = parseFloat(limitPrice);
      if (!isNaN(limit) && limit > 0) {
        orderRequest.limitPrice = limit;
      }
    }

    if (orderType === 'stop' || orderType === 'stop_limit') {
      const stop = parseFloat(stopPrice);
      if (!isNaN(stop) && stop > 0) {
        orderRequest.stopPrice = stop;
      }
    }

    if (orderType === 'trailing_stop') {
      const trail = parseFloat(trailAmount);
      if (!isNaN(trail) && trail > 0) {
        orderRequest.trailAmount = trail;
      }
    }

    placeOrderMutation.mutate(orderRequest, {
      onSuccess: (order) => {
        setSuccess(
          `Order ${order.status}: ${tradeSide.toUpperCase()} ${qty} ${selectedSymbol}` +
            (order.filledPrice ? ` @ ${formatCurrency(order.filledPrice)}` : '')
        );
        resetTradeForm();
      },
    });
  };

  const estimatedPrice =
    quote && orderType === 'market'
      ? tradeSide === 'buy'
        ? quote.ask
        : quote.bid
      : orderType === 'limit'
        ? parseFloat(limitPrice) || 0
        : 0;

  const qty = parseFloat(quantity) || 0;
  const estimatedTotal = qty * estimatedPrice;

  const showLimitPrice = orderType === 'limit' || orderType === 'stop_limit';
  const showStopPrice = orderType === 'stop' || orderType === 'stop_limit';
  const showTrailAmount = orderType === 'trailing_stop';

  // Validation logic for each order type
  const hasValidLimitPrice = parseFloat(limitPrice) > 0;
  const hasValidStopPrice = parseFloat(stopPrice) > 0;
  const hasValidTrailAmount = parseFloat(trailAmount) > 0;

  const isOrderTypeValid =
    orderType === 'market' ||
    (orderType === 'limit' && hasValidLimitPrice) ||
    (orderType === 'stop' && hasValidStopPrice) ||
    (orderType === 'stop_limit' && hasValidLimitPrice && hasValidStopPrice) ||
    (orderType === 'trailing_stop' && hasValidTrailAmount);

  const isValid = selectedSymbol && qty > 0 && isOrderTypeValid;

  if (!selectedSymbol) {
    return (
      <Widget title="Trade">
        <div style={styles.empty}>Select a symbol to place a trade</div>
      </Widget>
    );
  }

  return (
    <Widget title={`Trade ${selectedSymbol}`}>
      <form style={styles.form} onSubmit={handleSubmit}>
        {success && <div style={styles.success}>{success}</div>}

        {placeOrderMutation.error && (
          <div style={styles.error}>
            {placeOrderMutation.error instanceof Error
              ? placeOrderMutation.error.message
              : 'Order failed'}
          </div>
        )}

        {/* Side Toggle */}
        <div style={styles.sideToggle}>
          <button
            type="button"
            onClick={() => setTradeSide('buy')}
            style={{
              ...styles.sideButton,
              backgroundColor:
                tradeSide === 'buy' ? theme.colors.positive : theme.colors.bgTertiary,
              color:
                tradeSide === 'buy' ? theme.colors.bgPrimary : theme.colors.textSecondary,
            }}
          >
            BUY
          </button>
          <button
            type="button"
            onClick={() => setTradeSide('sell')}
            style={{
              ...styles.sideButton,
              backgroundColor:
                tradeSide === 'sell' ? theme.colors.negative : theme.colors.bgTertiary,
              color:
                tradeSide === 'sell' ? theme.colors.textPrimary : theme.colors.textSecondary,
            }}
          >
            SELL
          </button>
        </div>

        {/* Order Type & Time in Force Row */}
        <div style={styles.tifRow}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Order Type</label>
            <select
              value={orderType}
              onChange={(e) => {
                const newOrderType = e.target.value as OrderType;
                setOrderType(newOrderType);
                // If switching to a stop order, reset IOC/FOK to DAY
                if (
                  ['stop', 'stop_limit', 'trailing_stop'].includes(newOrderType) &&
                  (timeInForce === 'ioc' || timeInForce === 'fok')
                ) {
                  setTimeInForce('day');
                }
              }}
              style={styles.select}
            >
              {Object.entries(orderTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Time in Force</label>
            <select
              value={timeInForce}
              onChange={(e) => setTimeInForce(e.target.value as TimeInForce)}
              style={styles.select}
              title={timeInForceDescriptions[timeInForce]}
            >
              {Object.entries(timeInForceLabels).map(([value, label]) => {
                // Disable IOC/FOK for stop-based orders
                const disabled =
                  (value === 'ioc' || value === 'fok') && isStopOrder;
                return (
                  <option key={value} value={value} disabled={disabled}>
                    {label}
                    {disabled ? ' (not for stops)' : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Extended Hours Toggle (only for equity, during extended sessions) */}
        {isExtendedSession && (
          <div style={styles.fieldGroup}>
            <div
              style={styles.checkboxRow}
              onClick={() => {
                const newValue = !extendedHours;
                setExtendedHours(newValue);
                // Auto-switch to limit order when enabling extended hours
                if (newValue && orderType === 'market') {
                  setOrderType('limit');
                }
              }}
            >
              <input
                type="checkbox"
                checked={extendedHours}
                onChange={() => {}} // Handled by div onClick
                style={styles.checkbox}
              />
              <label style={styles.checkboxLabel}>Extended Hours Trading</label>
            </div>
            {extendedHours && (
              <div style={styles.warning}>
                Extended hours have wider spreads and lower liquidity. Limit
                orders only.
              </div>
            )}
          </div>
        )}

        {/* Quantity */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            min="0.0001"
            step="any"
            style={styles.input}
          />
        </div>

        {/* Price Inputs */}
        {(showLimitPrice || showStopPrice) && (
          <div style={styles.priceInputs}>
            {showLimitPrice && (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Limit Price</label>
                <input
                  type="number"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  style={styles.input}
                />
              </div>
            )}
            {showStopPrice && (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Stop Price</label>
                <input
                  type="number"
                  value={stopPrice}
                  onChange={(e) => setStopPrice(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  style={styles.input}
                />
              </div>
            )}
          </div>
        )}

        {showTrailAmount && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Trail Amount ($)</label>
            <input
              type="number"
              value={trailAmount}
              onChange={(e) => setTrailAmount(e.target.value)}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              style={styles.input}
            />
          </div>
        )}

        {/* Estimate */}
        {qty > 0 && estimatedTotal > 0 && (
          <div style={styles.estimate}>
            <span style={styles.estimateLabel}>
              Est. {tradeSide === 'buy' ? 'Cost' : 'Proceeds'}
            </span>
            <span style={styles.estimateValue}>{formatCurrency(estimatedTotal)}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!isValid || placeOrderMutation.isPending}
          style={{
            ...styles.submitButton,
            backgroundColor:
              tradeSide === 'buy' ? theme.colors.positive : theme.colors.negative,
            color: tradeSide === 'buy' ? theme.colors.bgPrimary : theme.colors.textPrimary,
            ...(!isValid || placeOrderMutation.isPending ? styles.disabled : {}),
          }}
        >
          {placeOrderMutation.isPending
            ? 'Placing Order...'
            : `${tradeSide.toUpperCase()} ${selectedSymbol}`}
        </button>
      </form>
    </Widget>
  );
}
