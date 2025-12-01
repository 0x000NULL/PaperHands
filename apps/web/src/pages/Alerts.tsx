import { useState, type CSSProperties } from 'react';
import { Layout } from '../components/Layout';
import { Widget } from '../components/dashboard/Widget';
import { theme } from '../theme/constants';
import {
  useAlerts,
  useCreateAlert,
  useDeleteAlert,
  useReactivateAlert,
  formatAlertDescription,
} from '../hooks/useAlerts';
import type {
  Alert,
  AlertType,
  AlertCondition,
  CreateAlertRequest,
} from '../api/client';

type AlertTab = 'active' | 'triggered' | 'all';

const alertTypeOptions: { value: AlertType; label: string }[] = [
  { value: 'PRICE', label: 'Price' },
  { value: 'PERCENT_CHANGE', label: 'Percent Change' },
  { value: 'VOLUME', label: 'Volume' },
  { value: 'GREEKS', label: 'Greeks' },
  { value: 'PORTFOLIO_VALUE', label: 'Portfolio Value' },
];

const conditionOptions: { value: AlertCondition; label: string }[] = [
  { value: 'ABOVE', label: 'Above' },
  { value: 'BELOW', label: 'Below' },
  { value: 'CROSSES', label: 'Crosses' },
];

const greekOptions = ['delta', 'gamma', 'theta', 'vega', 'rho'];

export function Alerts() {
  const [activeTab, setActiveTab] = useState<AlertTab>('active');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [formType, setFormType] = useState<AlertType>('PRICE');
  const [formSymbol, setFormSymbol] = useState('');
  const [formCondition, setFormCondition] = useState<AlertCondition>('ABOVE');
  const [formTargetValue, setFormTargetValue] = useState('');
  const [formGreekType, setFormGreekType] = useState('delta');
  const [formName, setFormName] = useState('');

  // Queries and mutations
  const { data: alerts, isLoading } = useAlerts(
    activeTab === 'active'
      ? { isActive: true }
      : activeTab === 'triggered'
        ? { isActive: false }
        : undefined
  );
  const createAlert = useCreateAlert();
  const deleteAlert = useDeleteAlert();
  const reactivateAlert = useReactivateAlert();

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: CreateAlertRequest = {
      type: formType,
      condition: formCondition,
      targetValue: parseFloat(formTargetValue),
    };

    if (formType !== 'PORTFOLIO_VALUE') {
      data.symbol = formSymbol.toUpperCase();
    }

    if (formType === 'GREEKS') {
      data.greekType = formGreekType;
    }

    if (formName.trim()) {
      data.name = formName.trim();
    }

    await createAlert.mutateAsync(data);

    // Reset form
    setFormSymbol('');
    setFormTargetValue('');
    setFormName('');
    setShowCreateForm(false);
  };

  const filteredAlerts = alerts || [];

  return (
    <Layout>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>Alerts</h1>
        <button
          style={styles.createButton}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? 'Cancel' : '+ New Alert'}
        </button>
      </div>

      {showCreateForm && (
        <Widget title="Create Alert">
          <form onSubmit={handleCreateAlert} style={styles.form}>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Alert Type</label>
                <select
                  style={styles.select}
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as AlertType)}
                >
                  {alertTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {formType !== 'PORTFOLIO_VALUE' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Symbol</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formSymbol}
                    onChange={(e) => setFormSymbol(e.target.value.toUpperCase())}
                    placeholder="AAPL"
                    required
                  />
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Condition</label>
                <select
                  style={styles.select}
                  value={formCondition}
                  onChange={(e) =>
                    setFormCondition(e.target.value as AlertCondition)
                  }
                >
                  {conditionOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Target Value
                  {formType === 'PERCENT_CHANGE' && ' (%)'}
                  {formType === 'PRICE' && ' ($)'}
                </label>
                <input
                  type="number"
                  step="any"
                  style={styles.input}
                  value={formTargetValue}
                  onChange={(e) => setFormTargetValue(e.target.value)}
                  placeholder={formType === 'PRICE' ? '150.00' : '5'}
                  required
                />
              </div>

              {formType === 'GREEKS' && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Greek</label>
                  <select
                    style={styles.select}
                    value={formGreekType}
                    onChange={(e) => setFormGreekType(e.target.value)}
                  >
                    {greekOptions.map((g) => (
                      <option key={g} value={g}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={styles.formRow}>
              <div style={{ ...styles.formGroup, flex: 2 }}>
                <label style={styles.label}>Name (optional)</label>
                <input
                  type="text"
                  style={styles.input}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="My price alert"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>&nbsp;</label>
                <button
                  type="submit"
                  style={styles.submitButton}
                  disabled={createAlert.isPending}
                >
                  {createAlert.isPending ? 'Creating...' : 'Create Alert'}
                </button>
              </div>
            </div>
          </form>
        </Widget>
      )}

      <div style={styles.tabs}>
        {(['active', 'triggered', 'all'] as AlertTab[]).map((tab) => (
          <button
            key={tab}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <Widget title={`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Alerts`}>
        {isLoading ? (
          <div style={styles.loading}>Loading alerts...</div>
        ) : filteredAlerts.length === 0 ? (
          <div style={styles.emptyState}>
            No {activeTab} alerts.{' '}
            {activeTab === 'active' && (
              <button
                style={styles.linkButton}
                onClick={() => setShowCreateForm(true)}
              >
                Create one
              </button>
            )}
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Alert</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onDelete={() => deleteAlert.mutate(alert.id)}
                  onReactivate={() => reactivateAlert.mutate(alert.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </Widget>
    </Layout>
  );
}

interface AlertRowProps {
  alert: Alert;
  onDelete: () => void;
  onReactivate: () => void;
}

function AlertRow({ alert, onDelete, onReactivate }: AlertRowProps) {
  return (
    <tr style={styles.tr}>
      <td style={styles.td}>
        <div style={styles.alertName}>
          {alert.name || formatAlertDescription(alert)}
        </div>
        {alert.name && (
          <div style={styles.alertDescription}>
            {formatAlertDescription(alert)}
          </div>
        )}
      </td>
      <td style={styles.td}>
        <span style={styles.typeBadge}>{alert.type.replace('_', ' ')}</span>
      </td>
      <td style={styles.td}>
        <span
          style={{
            ...styles.statusBadge,
            ...(alert.isActive ? styles.statusActive : styles.statusTriggered),
          }}
        >
          {alert.isActive ? 'Active' : 'Triggered'}
        </span>
        {alert.triggeredAt && (
          <div style={styles.triggeredAt}>
            {new Date(alert.triggeredAt).toLocaleString()}
          </div>
        )}
      </td>
      <td style={styles.td}>
        {new Date(alert.createdAt).toLocaleDateString()}
      </td>
      <td style={styles.td}>
        <div style={styles.actions}>
          {!alert.isActive && (
            <button style={styles.actionButton} onClick={onReactivate}>
              Reactivate
            </button>
          )}
          <button
            style={{ ...styles.actionButton, ...styles.deleteButton }}
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

const styles: Record<string, CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  pageTitle: {
    fontSize: theme.typography['2xl'],
    fontWeight: theme.typography.bold,
    color: theme.colors.textPrimary,
    margin: 0,
  },
  createButton: {
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
    border: 'none',
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    borderRadius: theme.radius.md,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  formRow: {
    display: 'flex',
    gap: theme.spacing.md,
    flexWrap: 'wrap',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
    flex: 1,
    minWidth: '150px',
  },
  label: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.medium,
  },
  input: {
    backgroundColor: theme.colors.bgInput,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
  },
  select: {
    backgroundColor: theme.colors.bgInput,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
  },
  submitButton: {
    backgroundColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
    border: 'none',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.md,
    fontSize: theme.typography.sm,
    fontWeight: theme.typography.semibold,
    cursor: 'pointer',
    width: '100%',
  },
  tabs: {
    display: 'flex',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  tab: {
    backgroundColor: 'transparent',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
    cursor: 'pointer',
    transition: theme.transitions.fast,
  },
  tabActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
    color: theme.colors.bgPrimary,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: theme.spacing.md,
    borderBottom: `1px solid ${theme.colors.border}`,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.semibold,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tr: {
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  td: {
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
  },
  alertName: {
    fontWeight: theme.typography.medium,
  },
  alertDescription: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    marginTop: '4px',
  },
  typeBadge: {
    backgroundColor: theme.colors.bgTertiary,
    padding: '4px 8px',
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    textTransform: 'capitalize',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.medium,
  },
  statusActive: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    color: theme.colors.positive,
  },
  statusTriggered: {
    backgroundColor: 'rgba(255, 165, 2, 0.15)',
    color: theme.colors.warning,
  },
  triggeredAt: {
    fontSize: '10px',
    color: theme.colors.textTertiary,
    marginTop: '4px',
  },
  actions: {
    display: 'flex',
    gap: theme.spacing.sm,
  },
  actionButton: {
    backgroundColor: 'transparent',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    padding: '4px 8px',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.xs,
    cursor: 'pointer',
  },
  deleteButton: {
    borderColor: theme.colors.negative,
    color: theme.colors.negative,
  },
  loading: {
    padding: theme.spacing.xl,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  emptyState: {
    padding: theme.spacing.xl,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: theme.colors.accent,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};
