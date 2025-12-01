import { useMemo, type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useChartTheme } from '../../hooks/useChartTheme';

interface PayoffDiagramProps {
  optionType: 'call' | 'put';
  side: 'long' | 'short';
  strike: number;
  premium: number;
  contracts?: number;
  currentPrice?: number;
  width?: number;
  height?: number;
}

const styles: Record<string, CSSProperties> = {
  container: {
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  title: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: theme.spacing.sm,
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
};

export function PayoffDiagram({
  optionType,
  side,
  strike,
  premium,
  contracts = 1,
  currentPrice,
  width = 400,
  height = 250,
}: PayoffDiagramProps) {
  const chartColors = useChartTheme();
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const data = useMemo(() => {
    const multiplier = 100;
    const totalPremium = premium * contracts * multiplier;
    const isLong = side === 'long';
    const isCall = optionType === 'call';

    // Calculate break-even
    const breakEven = isCall ? strike + premium : strike - premium;

    // Generate price range (20% below to 20% above strike)
    const minPrice = strike * 0.7;
    const maxPrice = strike * 1.3;
    const priceStep = (maxPrice - minPrice) / 50;

    const points: { price: number; pnl: number }[] = [];

    for (let price = minPrice; price <= maxPrice; price += priceStep) {
      let intrinsicValue: number;
      if (isCall) {
        intrinsicValue = Math.max(0, price - strike);
      } else {
        intrinsicValue = Math.max(0, strike - price);
      }

      const optionValue = intrinsicValue * contracts * multiplier;
      const pnl = isLong ? optionValue - totalPremium : totalPremium - optionValue;

      points.push({ price, pnl });
    }

    // Calculate min/max P&L for scaling
    const pnlValues = points.map((p) => p.pnl);
    const minPnL = Math.min(...pnlValues);
    const maxPnL = Math.max(...pnlValues);

    // Add some padding to the P&L range
    const pnlPadding = Math.max(Math.abs(maxPnL - minPnL) * 0.1, totalPremium * 0.5);
    const yMin = minPnL - pnlPadding;
    const yMax = maxPnL + pnlPadding;

    // Calculate max profit/loss
    let maxProfit: number | 'unlimited';
    let maxLoss: number | 'unlimited';

    if (isLong) {
      if (isCall) {
        maxProfit = 'unlimited';
        maxLoss = totalPremium;
      } else {
        maxProfit = (strike - premium) * contracts * multiplier;
        maxLoss = totalPremium;
      }
    } else {
      if (isCall) {
        maxProfit = totalPremium;
        maxLoss = 'unlimited';
      } else {
        maxProfit = totalPremium;
        maxLoss = (strike - premium) * contracts * multiplier;
      }
    }

    return {
      points,
      minPrice,
      maxPrice,
      yMin,
      yMax,
      breakEven,
      maxProfit,
      maxLoss,
      totalPremium,
    };
  }, [optionType, side, strike, premium, contracts]);

  // Scale functions
  const xScale = (price: number) =>
    ((price - data.minPrice) / (data.maxPrice - data.minPrice)) * innerWidth;

  const yScale = (pnl: number) =>
    innerHeight - ((pnl - data.yMin) / (data.yMax - data.yMin)) * innerHeight;

  // Generate SVG path for the payoff line
  const pathD = useMemo(() => {
    const pathParts: string[] = [];

    data.points.forEach((point, i) => {
      const x = xScale(point.price);
      const y = yScale(point.pnl);

      if (i === 0) {
        pathParts.push(`M ${x} ${y}`);
      } else {
        pathParts.push(`L ${x} ${y}`);
      }
    });

    return pathParts.join(' ');
  }, [data.points, xScale, yScale]);

  // Generate area paths for profit/loss regions
  const { profitPath, lossPath } = useMemo(() => {
    const zeroY = yScale(0);
    let profitParts: string[] = [];
    let lossParts: string[] = [];

    // Split points at breakeven
    const profitPoints: { price: number; pnl: number }[] = [];
    const lossPoints: { price: number; pnl: number }[] = [];

    data.points.forEach((point) => {
      if (point.pnl >= 0) {
        profitPoints.push(point);
      } else {
        lossPoints.push(point);
      }
    });

    // Create profit area
    if (profitPoints.length > 0) {
      profitParts = [`M ${xScale(profitPoints[0].price)} ${zeroY}`];
      profitPoints.forEach((p) => {
        profitParts.push(`L ${xScale(p.price)} ${yScale(p.pnl)}`);
      });
      profitParts.push(`L ${xScale(profitPoints[profitPoints.length - 1].price)} ${zeroY}`);
      profitParts.push('Z');
    }

    // Create loss area
    if (lossPoints.length > 0) {
      lossParts = [`M ${xScale(lossPoints[0].price)} ${zeroY}`];
      lossPoints.forEach((p) => {
        lossParts.push(`L ${xScale(p.price)} ${yScale(p.pnl)}`);
      });
      lossParts.push(`L ${xScale(lossPoints[lossPoints.length - 1].price)} ${zeroY}`);
      lossParts.push('Z');
    }

    return {
      profitPath: profitParts.join(' '),
      lossPath: lossParts.join(' '),
    };
  }, [data.points, xScale, yScale]);

  // Format values for display
  const formatPrice = (val: number) => `$${val.toFixed(0)}`;
  const formatPnL = (val: number) =>
    val >= 0 ? `+$${val.toFixed(0)}` : `-$${Math.abs(val).toFixed(0)}`;

  // Generate axis ticks
  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    const range = data.maxPrice - data.minPrice;
    const step = range / 5;
    for (let i = 0; i <= 5; i++) {
      ticks.push(data.minPrice + i * step);
    }
    return ticks;
  }, [data.minPrice, data.maxPrice]);

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const range = data.yMax - data.yMin;
    const step = range / 4;
    for (let i = 0; i <= 4; i++) {
      ticks.push(data.yMin + i * step);
    }
    return ticks;
  }, [data.yMin, data.yMax]);

  const positionLabel = `${side === 'long' ? 'Long' : 'Short'} ${optionType === 'call' ? 'Call' : 'Put'}`;

  return (
    <div style={styles.container}>
      <div style={styles.title}>{positionLabel} Payoff at Expiration</div>

      <svg width={width} height={height}>
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Grid lines */}
          {yTicks.map((tick) => (
            <line
              key={`grid-y-${tick}`}
              x1={0}
              y1={yScale(tick)}
              x2={innerWidth}
              y2={yScale(tick)}
              stroke={chartColors.grid}
              strokeDasharray="2,2"
              strokeWidth={0.5}
            />
          ))}

          {/* Zero line (highlighted) */}
          <line
            x1={0}
            y1={yScale(0)}
            x2={innerWidth}
            y2={yScale(0)}
            stroke={chartColors.text}
            strokeWidth={1}
          />

          {/* Profit area */}
          {profitPath && (
            <path d={profitPath} fill={chartColors.positive} fillOpacity={0.15} />
          )}

          {/* Loss area */}
          {lossPath && (
            <path d={lossPath} fill={chartColors.negative} fillOpacity={0.15} />
          )}

          {/* Payoff line */}
          <path
            d={pathD}
            fill="none"
            stroke={chartColors.positive}
            strokeWidth={2}
          />

          {/* Strike price vertical line */}
          <line
            x1={xScale(strike)}
            y1={0}
            x2={xScale(strike)}
            y2={innerHeight}
            stroke={chartColors.accent}
            strokeDasharray="4,4"
            strokeWidth={1}
          />
          <text
            x={xScale(strike)}
            y={-5}
            textAnchor="middle"
            fill={chartColors.accent}
            fontSize={10}
          >
            Strike
          </text>

          {/* Break-even vertical line */}
          <line
            x1={xScale(data.breakEven)}
            y1={0}
            x2={xScale(data.breakEven)}
            y2={innerHeight}
            stroke={chartColors.palette[2]}
            strokeDasharray="4,4"
            strokeWidth={1}
          />
          <text
            x={xScale(data.breakEven)}
            y={innerHeight + 25}
            textAnchor="middle"
            fill={chartColors.palette[2]}
            fontSize={10}
          >
            B/E: {formatPrice(data.breakEven)}
          </text>

          {/* Current price marker */}
          {currentPrice && currentPrice >= data.minPrice && currentPrice <= data.maxPrice && (
            <>
              <line
                x1={xScale(currentPrice)}
                y1={0}
                x2={xScale(currentPrice)}
                y2={innerHeight}
                stroke={chartColors.palette[0]}
                strokeWidth={2}
              />
              <circle
                cx={xScale(currentPrice)}
                cy={yScale(
                  data.points.find(
                    (p) => Math.abs(p.price - currentPrice) < (data.maxPrice - data.minPrice) / 50
                  )?.pnl || 0
                )}
                r={5}
                fill={chartColors.palette[0]}
              />
              <text
                x={xScale(currentPrice)}
                y={-5}
                textAnchor="middle"
                fill={chartColors.palette[0]}
                fontSize={10}
                fontWeight="bold"
              >
                Now
              </text>
            </>
          )}

          {/* X-axis */}
          <line
            x1={0}
            y1={innerHeight}
            x2={innerWidth}
            y2={innerHeight}
            stroke={chartColors.text}
            strokeWidth={1}
          />
          {xTicks.map((tick) => (
            <g key={`x-tick-${tick}`}>
              <line
                x1={xScale(tick)}
                y1={innerHeight}
                x2={xScale(tick)}
                y2={innerHeight + 5}
                stroke={chartColors.text}
              />
              <text
                x={xScale(tick)}
                y={innerHeight + 15}
                textAnchor="middle"
                fill={chartColors.text}
                fontSize={9}
              >
                {formatPrice(tick)}
              </text>
            </g>
          ))}
          <text
            x={innerWidth / 2}
            y={innerHeight + 30}
            textAnchor="middle"
            fill={chartColors.text}
            fontSize={10}
          >
            Underlying Price
          </text>

          {/* Y-axis */}
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={innerHeight}
            stroke={chartColors.text}
            strokeWidth={1}
          />
          {yTicks.map((tick) => (
            <g key={`y-tick-${tick}`}>
              <line
                x1={-5}
                y1={yScale(tick)}
                x2={0}
                y2={yScale(tick)}
                stroke={chartColors.text}
              />
              <text
                x={-10}
                y={yScale(tick) + 3}
                textAnchor="end"
                fill={chartColors.text}
                fontSize={9}
              >
                {formatPnL(tick)}
              </text>
            </g>
          ))}
          <text
            x={-45}
            y={innerHeight / 2}
            textAnchor="middle"
            fill={chartColors.text}
            fontSize={10}
            transform={`rotate(-90, -45, ${innerHeight / 2})`}
          >
            Profit / Loss
          </text>
        </g>
      </svg>

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, backgroundColor: chartColors.accent }} />
          <span>Strike: {formatPrice(strike)}</span>
        </div>
        <div style={styles.legendItem}>
          <span style={{ ...styles.legendDot, backgroundColor: chartColors.palette[2] }} />
          <span>Break-even</span>
        </div>
        {currentPrice && (
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, backgroundColor: chartColors.palette[0] }} />
            <span>Current: {formatPrice(currentPrice)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
