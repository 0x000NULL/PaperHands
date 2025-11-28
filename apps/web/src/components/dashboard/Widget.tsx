import type { ReactNode, CSSProperties } from 'react';
import { theme } from '../../theme/constants';

interface WidgetProps {
  title: string;
  children: ReactNode;
  headerAction?: ReactNode;
  noPadding?: boolean;
  style?: CSSProperties;
  className?: string;
}

const styles: Record<string, CSSProperties> = {
  container: {
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.border}`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    borderBottom: `1px solid ${theme.colors.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.bgTertiary,
  },
  title: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    margin: 0,
  },
  body: {
    padding: theme.spacing.lg,
    flex: 1,
    overflow: 'auto',
  },
  bodyNoPadding: {
    padding: 0,
    flex: 1,
    overflow: 'auto',
  },
};

export function Widget({
  title,
  children,
  headerAction,
  noPadding = false,
  style,
}: WidgetProps) {
  return (
    <div style={{ ...styles.container, ...style }}>
      <div style={styles.header}>
        <h3 style={styles.title}>{title}</h3>
        {headerAction && <div>{headerAction}</div>}
      </div>
      <div style={noPadding ? styles.bodyNoPadding : styles.body}>
        {children}
      </div>
    </div>
  );
}
