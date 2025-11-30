import { useState, type CSSProperties } from 'react';
import { Layout } from '../components/Layout';
import { Widget } from '../components/dashboard/Widget';
import { theme } from '../theme/constants';
import { UserManagement } from '../components/admin/UserManagement';
import { OrderMonitoring } from '../components/admin/OrderMonitoring';
import { SystemHealth } from '../components/admin/SystemHealth';

type AdminTab = 'users' | 'orders' | 'system';

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

const tabs: { id: AdminTab; label: string }[] = [
  { id: 'users', label: 'User Management' },
  { id: 'orders', label: 'Order Monitoring' },
  { id: 'system', label: 'System Health' },
];

export function Admin() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'orders':
        return <OrderMonitoring />;
      case 'system':
        return <SystemHealth />;
      default:
        return null;
    }
  };

  const getTabTitle = () => {
    const tab = tabs.find((t) => t.id === activeTab);
    return tab?.label ?? 'Admin';
  };

  return (
    <Layout>
      <h1 style={styles.pageTitle}>Admin Dashboard</h1>
      <div style={styles.container}>
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
        <div style={styles.content}>
          <Widget title={getTabTitle()}>{renderContent()}</Widget>
        </div>
      </div>
    </Layout>
  );
}
