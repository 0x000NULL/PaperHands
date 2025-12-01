import { useMemo, type CSSProperties } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { theme } from '../../theme/constants';
import { useChartTheme } from '../../hooks/useChartTheme';
import type { AllocationItem, SectorAllocation } from '../../api/client';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  chartContainer: {
    height: 200,
  },
  legend: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    fontSize: theme.typography.sm,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: theme.radius.sm,
    flexShrink: 0,
  },
  legendLabel: {
    flex: 1,
    color: theme.colors.textPrimary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  legendValue: {
    fontFamily: theme.typography.fontMono,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    height: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
  },
};

interface TooltipPayload {
  name: string;
  value: number;
  payload: {
    name: string;
    value: number;
    marketValue: number;
    color: string;
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

  const data = payload[0].payload;
  return (
    <div
      style={{
        backgroundColor: theme.colors.bgSecondary,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.md,
        padding: theme.spacing.sm,
        boxShadow: theme.shadows.md,
      }}
    >
      <div style={{ color: theme.colors.accent, fontWeight: 600 }}>
        {data.name}
      </div>
      <div style={{ color: theme.colors.textPrimary, fontSize: theme.typography.sm }}>
        ${data.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div style={{ color: theme.colors.textSecondary, fontSize: theme.typography.sm }}>
        {data.value.toFixed(1)}% of portfolio
      </div>
    </div>
  );
}

interface AllocationPieChartProps {
  data: AllocationItem[] | SectorAllocation[];
  type: 'position' | 'sector';
  maxItems?: number;
}

export function AllocationPieChart({
  data,
  type,
  maxItems = 8,
}: AllocationPieChartProps) {
  const chartColors = useChartTheme();

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Sort by allocation descending
    const sorted = [...data].sort((a, b) => b.allocation - a.allocation);

    // Group small items into "Other"
    const displayItems = sorted.slice(0, maxItems);
    const otherItems = sorted.slice(maxItems);

    const result = displayItems.map((item, index) => {
      const name = type === 'position'
        ? (item as AllocationItem).symbol
        : (item as SectorAllocation).sector;
      const marketValue = item.marketValue;

      return {
        name,
        value: item.allocation,
        marketValue,
        color: chartColors.palette[index % chartColors.palette.length],
      };
    });

    // Add "Other" category if there are remaining items
    if (otherItems.length > 0) {
      const otherValue = otherItems.reduce((sum, item) => sum + item.allocation, 0);
      const otherMarketValue = otherItems.reduce((sum, item) => sum + item.marketValue, 0);
      result.push({
        name: `Other (${otherItems.length})`,
        value: otherValue,
        marketValue: otherMarketValue,
        color: theme.colors.textTertiary,
      });
    }

    return result;
  }, [data, type, maxItems, chartColors.palette]);

  if (!data || data.length === 0) {
    return <div style={styles.emptyState}>No positions</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.legend}>
        {chartData.map((item) => (
          <div key={item.name} style={styles.legendItem}>
            <div style={{ ...styles.legendColor, backgroundColor: item.color }} />
            <span style={styles.legendLabel}>{item.name}</span>
            <span style={styles.legendValue}>{item.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
