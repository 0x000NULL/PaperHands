import { useState, type CSSProperties } from 'react';
import { Layout } from '../components/Layout';
import { Widget } from '../components/dashboard/Widget';
import { theme } from '../theme/constants';
import { TradingPreferences } from '../components/settings/TradingPreferences';
import { AccountSettings } from '../components/settings/AccountSettings';
import { DisplaySettings } from '../components/settings/DisplaySettings';
import { NotificationSettings } from '../components/settings/NotificationSettings';
import { HelpSettings } from '../components/settings/HelpSettings';

type SettingsTab = 'trading' | 'account' | 'display' | 'notifications' | 'help';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    gap: theme.spacing.lg,
    minHeight: 'calc(100vh - 120px)',
  },
  sidebar: {
    width: 200,
    flexShrink: 0,
  },
  sidebarNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.lg,
    border: `1px solid ${theme.colors.border}`,
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: theme.radius.md,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    cursor: 'pointer',
    transition: theme.transitions.fast,
    textAlign: 'left' as const,
  },
  navButtonActive: {
    backgroundColor: theme.colors.bgTertiary,
    color: theme.colors.accent,
  },
  navButtonHover: {
    backgroundColor: theme.colors.bgHover,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    fontSize: theme.typography['2xl'],
    fontWeight: theme.typography.bold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
};

const tabs: { id: SettingsTab; label: string; icon: string }[] = [
  { id: 'trading', label: 'Trading', icon: 'chart' },
  { id: 'account', label: 'Account', icon: 'user' },
  { id: 'display', label: 'Display', icon: 'sun' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'help', label: 'Help', icon: 'help' },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('trading');

  const renderContent = () => {
    switch (activeTab) {
      case 'trading':
        return <TradingPreferences />;
      case 'account':
        return <AccountSettings />;
      case 'display':
        return <DisplaySettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'help':
        return <HelpSettings />;
      default:
        return null;
    }
  };

  const getTabTitle = () => {
    const tab = tabs.find((t) => t.id === activeTab);
    return tab?.label ?? 'Settings';
  };

  return (
    <Layout>
      <h1 style={styles.pageTitle}>Settings</h1>
      <div style={styles.container}>
        {/* Sidebar */}
        <div style={styles.sidebar}>
          <nav style={styles.sidebarNav}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                style={{
                  ...styles.navButton,
                  ...(activeTab === tab.id ? styles.navButtonActive : {}),
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div style={styles.content}>
          <Widget title={getTabTitle()}>
            {renderContent()}
          </Widget>
        </div>
      </div>
    </Layout>
  );
}
