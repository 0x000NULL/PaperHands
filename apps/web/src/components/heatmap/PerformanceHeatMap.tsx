import { useMemo, type CSSProperties } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { theme } from '../../theme/constants';
import { useChartTheme } from '../../hooks/useChartTheme';
import { Widget } from '../dashboard/Widget';
import { useWatchlist, useWatchlistQuotes } from '../../hooks/useWatchlists';
import { useWatchlistStore } from '../../store/watchlistStore';

const styles: Record<string, CSSProperties> = {
  container: {
    height: '250px',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
  },
  legendColor: {
    width: '12px',
    height: '12px',
    borderRadius: theme.radius.sm,
  },
};

// Color scale from red (-5%) to gray (0%) to green (+5%)
function getColorForChange(
  change: number,
  colors: { positive: string; negative: string; neutral: string }
): string {
  if (change >= 5) return colors.positive;
  if (change <= -5) return colors.negative;
  if (change === 0) return colors.neutral;

  // For interpolation, we'll use the colors at boundaries
  // Since the theme provides hex colors, we'll use CSS for interpolation
  if (change > 0) {
    // More intense green as change increases
    const intensity = Math.min(change / 5, 1);
    return intensity > 0.5 ? colors.positive : colors.neutral;
  } else {
    // More intense red as change decreases
    const intensity = Math.min(Math.abs(change) / 5, 1);
    return intensity > 0.5 ? colors.negative : colors.neutral;
  }
}

interface TreemapCellProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  change: number;
  heatmapColors?: { positive: string; negative: string; neutral: string };
}

function CustomCell({ x, y, width, height, name, change, heatmapColors }: TreemapCellProps) {
  const showLabel = width > 40 && height > 30;
  const showChange = width > 50 && height > 45;

  const colors = heatmapColors ?? {
    positive: '#22c55e',
    negative: '#ef4444',
    neutral: '#6b7280',
  };

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={getColorForChange(change, colors)}
        stroke={theme.colors.bgPrimary}
        strokeWidth={2}
        rx={4}
      />
      {showLabel && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - (showChange ? 6 : 0)}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={theme.colors.textPrimary}
            fontSize={11}
            fontWeight={600}
          >
            {name}
          </text>
          {showChange && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 10}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={theme.colors.textSecondary}
              fontSize={10}
            >
              {change > 0 ? '+' : ''}
              {change.toFixed(1)}%
            </text>
          )}
        </>
      )}
    </g>
  );
}

interface TooltipPayload {
  name: string;
  value: number;
  payload: {
    change: number;
    price: number;
  };
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0];
  return (
    <div
      style={{
        backgroundColor: theme.colors.bgSecondary,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.md,
        padding: theme.spacing.sm,
      }}
    >
      <div style={{ color: theme.colors.accent, fontWeight: 600 }}>
        {data.name}
      </div>
      <div style={{ color: theme.colors.textPrimary, fontSize: theme.typography.sm }}>
        ${data.payload.price?.toFixed(2)}
      </div>
      <div
        style={{
          color:
            data.payload.change > 0
              ? theme.colors.positive
              : data.payload.change < 0
                ? theme.colors.negative
                : theme.colors.textSecondary,
          fontSize: theme.typography.sm,
        }}
      >
        {data.payload.change > 0 ? '+' : ''}
        {data.payload.change?.toFixed(2)}%
      </div>
    </div>
  );
}

export function PerformanceHeatMap() {
  const { activeWatchlistId } = useWatchlistStore();
  const { data: watchlist } = useWatchlist(activeWatchlistId);
  const chartColors = useChartTheme();

  const heatmapColors = useMemo(
    () => ({
      positive: chartColors.heatmapPositive,
      negative: chartColors.heatmapNegative,
      neutral: chartColors.heatmapNeutral,
    }),
    [chartColors]
  );

  const symbols = useMemo(
    () => watchlist?.items.map((item) => item.symbol) ?? [],
    [watchlist],
  );

  const { data: quotes } = useWatchlistQuotes(symbols);

  const heatmapData = useMemo(() => {
    if (!quotes || quotes.length === 0) return [];

    return quotes.map((quote) => ({
      name: quote.symbol,
      size: 1, // Equal weight for now
      change: quote.change_percentage,
      price: quote.last,
    }));
  }, [quotes]);

  return (
    <Widget title="Performance Heat Map">
      <div style={styles.container}>
        {heatmapData.length === 0 ? (
          <div style={styles.emptyState}>
            Add symbols to see performance visualization
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={heatmapData}
              dataKey="size"
              nameKey="name"
              stroke={theme.colors.bgPrimary}
              content={<CustomCell x={0} y={0} width={0} height={0} name="" change={0} heatmapColors={heatmapColors} />}
            >
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        )}
      </div>
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendColor, backgroundColor: heatmapColors.negative }} />
          <span>-5%+</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendColor, backgroundColor: heatmapColors.neutral }} />
          <span>0%</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendColor, backgroundColor: heatmapColors.positive }} />
          <span>+5%+</span>
        </div>
      </div>
    </Widget>
  );
}
