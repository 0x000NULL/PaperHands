import { type ReactNode, type CSSProperties } from 'react';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';
import { TabToggle, type TabOption } from './TabToggle';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { theme } from '../../theme/constants';

export interface SwipeableTab<T extends string> extends TabOption<T> {
  content: ReactNode;
}

export interface SwipeableTabsProps<T extends string> {
  tabs: SwipeableTab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  className?: string;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  contentWrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    touchAction: 'pan-y', // Allow vertical scrolling, capture horizontal for swipe
  },
  indicator: {
    display: 'flex',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  dot: {
    width: '6px',
    height: '6px',
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.border,
    transition: theme.transitions.fast,
  },
  dotActive: {
    backgroundColor: theme.colors.accent,
    transform: 'scale(1.2)',
  },
};

export function SwipeableTabs<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  className,
}: SwipeableTabsProps<T>) {
  const isMobile = useIsMobile();
  const currentIndex = tabs.findIndex((t) => t.value === activeTab);

  const { bind, swiping } = useSwipeNavigation({
    enabled: isMobile,
    threshold: 60,
    onSwipeLeft: () => {
      if (currentIndex < tabs.length - 1) {
        onTabChange(tabs[currentIndex + 1].value);
      }
    },
    onSwipeRight: () => {
      if (currentIndex > 0) {
        onTabChange(tabs[currentIndex - 1].value);
      }
    },
  });

  const tabOptions = tabs.map(({ value, label, badge }) => ({ value, label, badge }));
  const activeContent = tabs.find((t) => t.value === activeTab)?.content;

  return (
    <div style={styles.container} className={className}>
      <TabToggle options={tabOptions} value={activeTab} onChange={onTabChange} />

      <div
        {...(isMobile ? bind() : {})}
        style={{
          ...styles.content,
          cursor: swiping ? 'grabbing' : undefined,
        }}
      >
        {activeContent}
      </div>

      {/* Mobile swipe indicators */}
      {isMobile && tabs.length > 1 && (
        <div style={styles.indicator}>
          {tabs.map((tab, index) => (
            <div
              key={tab.value}
              style={{
                ...styles.dot,
                ...(index === currentIndex ? styles.dotActive : {}),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
