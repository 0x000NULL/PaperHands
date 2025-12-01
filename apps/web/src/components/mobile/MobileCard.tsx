import { useState, type CSSProperties, type ReactNode } from 'react';
import { theme } from '../../theme/constants';

export type MobileCardVariant = 'default' | 'call' | 'put' | 'itmCall' | 'itmPut' | 'positive' | 'negative';

export interface MobileCardProps {
  header?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  expandable?: boolean;
  defaultExpanded?: boolean;
  expandedContent?: ReactNode;
  onTap?: () => void;
  variant?: MobileCardVariant;
  className?: string;
}

const getVariantStyles = (variant: MobileCardVariant): CSSProperties => {
  switch (variant) {
    case 'call':
      return { backgroundColor: theme.colors.bgTertiary };
    case 'put':
      return { backgroundColor: theme.colors.bgTertiary };
    case 'itmCall':
      return {
        backgroundColor: theme.colors.bgTertiary,
        borderLeft: `3px solid ${theme.colors.positive}`,
      };
    case 'itmPut':
      return {
        backgroundColor: theme.colors.bgTertiary,
        borderLeft: `3px solid ${theme.colors.negative}`,
      };
    case 'positive':
      return { borderLeft: `3px solid ${theme.colors.positive}` };
    case 'negative':
      return { borderLeft: `3px solid ${theme.colors.negative}` };
    default:
      return {};
  }
};

const styles: Record<string, CSSProperties> = {
  card: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgTertiary,
    borderRadius: theme.radius.md,
    border: `1px solid ${theme.colors.border}`,
    cursor: 'pointer',
    transition: theme.transitions.fast,
    minHeight: '48px', // Touch target minimum
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: '24px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexShrink: 0,
  },
  content: {
    marginTop: theme.spacing.sm,
  },
  expandButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    marginTop: theme.spacing.sm,
    backgroundColor: 'transparent',
    border: 'none',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    cursor: 'pointer',
    width: '100%',
    gap: theme.spacing.xs,
    borderTop: `1px solid ${theme.colors.border}`,
    paddingTop: theme.spacing.sm,
    minHeight: '44px', // Touch target
  },
  expandedSection: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTop: `1px solid ${theme.colors.border}`,
  },
  chevron: {
    transition: theme.transitions.fast,
  },
  chevronExpanded: {
    transform: 'rotate(180deg)',
  },
};

export function MobileCard({
  header,
  headerRight,
  children,
  expandable = false,
  defaultExpanded = false,
  expandedContent,
  onTap,
  variant = 'default',
  className,
}: MobileCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleCardClick = () => {
    if (onTap) {
      onTap();
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const variantStyles = getVariantStyles(variant);

  return (
    <div
      style={{ ...styles.card, ...variantStyles }}
      className={className}
      onClick={handleCardClick}
    >
      {(header || headerRight) && (
        <div style={styles.cardHeader}>
          <div style={styles.headerLeft}>
            {header}
          </div>
          {headerRight && (
            <div style={styles.headerRight}>
              {headerRight}
            </div>
          )}
        </div>
      )}

      <div style={header || headerRight ? styles.content : undefined}>
        {children}
      </div>

      {expandable && expandedContent && (
        <>
          <button
            style={styles.expandButton}
            onClick={handleExpandClick}
          >
            {isExpanded ? 'Hide Details' : 'Show Details'}
            <span
              style={{
                ...styles.chevron,
                ...(isExpanded ? styles.chevronExpanded : {}),
              }}
            >
              ▼
            </span>
          </button>
          {isExpanded && (
            <div style={styles.expandedSection}>
              {expandedContent}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Helper sub-components for consistent card row styling
export interface CardRowProps {
  label: string;
  value: ReactNode;
  valueColor?: string;
  labelStyle?: CSSProperties;
  valueStyle?: CSSProperties;
}

const cardRowStyles: Record<string, CSSProperties> = {
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${theme.spacing.xs} 0`,
  },
  label: {
    fontSize: theme.typography.sm,
    color: theme.colors.textSecondary,
  },
  value: {
    fontSize: theme.typography.sm,
    fontFamily: theme.typography.fontMono,
    color: theme.colors.textPrimary,
  },
};

export function CardRow({ label, value, valueColor, labelStyle, valueStyle }: CardRowProps) {
  return (
    <div style={cardRowStyles.row}>
      <span style={{ ...cardRowStyles.label, ...labelStyle }}>{label}</span>
      <span style={{ ...cardRowStyles.value, color: valueColor || theme.colors.textPrimary, ...valueStyle }}>
        {value}
      </span>
    </div>
  );
}

// Card list container
export interface MobileCardListProps {
  children: ReactNode;
  className?: string;
}

const cardListStyles: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing.sm,
  padding: theme.spacing.md,
};

export function MobileCardList({ children, className }: MobileCardListProps) {
  return (
    <div style={cardListStyles} className={className}>
      {children}
    </div>
  );
}
