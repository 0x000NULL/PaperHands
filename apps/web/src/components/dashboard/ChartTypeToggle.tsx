import type { CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import type { ChartType } from './ChartContainer';

interface ChartTypeToggleProps {
  chartType: ChartType;
  onChange: (type: ChartType) => void;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    gap: theme.spacing.xs,
  },
  button: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: 'transparent',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    fontFamily: theme.typography.fontFamily,
    cursor: 'pointer',
    transition: theme.transitions.fast,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
  },
  activeButton: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
  },
};

// SVG icons for chart types
function CandlestickIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="4" width="3" height="8" fill="currentColor" />
      <line
        x1="3.5"
        y1="2"
        x2="3.5"
        y2="14"
        stroke="currentColor"
        strokeWidth="1"
      />
      <rect x="7" y="6" width="3" height="6" fill="currentColor" />
      <line
        x1="8.5"
        y1="3"
        x2="8.5"
        y2="13"
        stroke="currentColor"
        strokeWidth="1"
      />
      <rect x="12" y="5" width="2" height="5" fill="currentColor" />
      <line
        x1="13"
        y1="2"
        x2="13"
        y2="12"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2 10L5 7L8 9L14 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ChartTypeToggle({ chartType, onChange }: ChartTypeToggleProps) {
  return (
    <div style={styles.container}>
      <button
        onClick={() => onChange('candlestick')}
        style={{
          ...styles.button,
          ...(chartType === 'candlestick' ? styles.activeButton : {}),
        }}
        title="Candlestick Chart"
      >
        <CandlestickIcon />
      </button>
      <button
        onClick={() => onChange('line')}
        style={{
          ...styles.button,
          ...(chartType === 'line' ? styles.activeButton : {}),
        }}
        title="Line Chart"
      >
        <LineIcon />
      </button>
    </div>
  );
}
