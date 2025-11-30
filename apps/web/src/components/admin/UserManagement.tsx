import { useState, type CSSProperties } from 'react';
import { theme } from '../../theme/constants';
import { useAuthStore } from '../../store/authStore';
import {
  useAdminUsers,
  useUpdateUserRole,
  useAdjustBalance,
  useDisableUser,
  useEnableUser,
} from '../../hooks/useAdmin';
import type { UserRole, AdminUser } from '../../types';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  searchBar: {
    display: 'flex',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  searchInput: {
    flex: 1,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.bgTertiary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: theme.typography.sm,
  },
  th: {
    padding: theme.spacing.sm,
    textAlign: 'left',
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.medium,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  td: {
    padding: theme.spacing.sm,
    borderBottom: `1px solid ${theme.colors.border}`,
    color: theme.colors.textPrimary,
  },
  roleBadge: {
    display: 'inline-block',
    padding: `2px ${theme.spacing.xs}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    fontWeight: theme.typography.medium,
  },
  roleUser: {
    backgroundColor: theme.colors.bgTertiary,
    color: theme.colors.textSecondary,
  },
  roleAdmin: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    color: '#ffc107',
  },
  roleSuperAdmin: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: theme.colors.accent,
  },
  statusBadge: {
    display: 'inline-block',
    padding: `2px ${theme.spacing.xs}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
  },
  statusActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: theme.colors.positive,
  },
  statusDisabled: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: theme.colors.negative,
  },
  actions: {
    display: 'flex',
    gap: theme.spacing.xs,
  },
  actionButton: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.typography.xs,
    cursor: 'pointer',
    border: 'none',
    transition: theme.transitions.fast,
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    color: '#fff',
  },
  dangerButton: {
    backgroundColor: theme.colors.negative,
    color: '#fff',
  },
  successButton: {
    backgroundColor: theme.colors.positive,
    color: '#fff',
  },
  select: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    backgroundColor: theme.colors.bgTertiary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.sm,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.xs,
    cursor: 'pointer',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sm,
  },
  paginationButtons: {
    display: 'flex',
    gap: theme.spacing.sm,
  },
  loading: {
    textAlign: 'center',
    padding: theme.spacing.xl,
    color: theme.colors.textSecondary,
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: theme.colors.bgSecondary,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    minWidth: 400,
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: theme.typography.lg,
    fontWeight: theme.typography.bold,
    marginBottom: theme.spacing.md,
    color: theme.colors.textPrimary,
  },
  modalInput: {
    width: '100%',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.bgTertiary,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radius.md,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.sm,
    marginBottom: theme.spacing.md,
  },
  modalButtons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
};

const LIMIT = 20;

export function UserManagement() {
  const { user: currentUser } = useAuthStore();
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [adjustBalanceModal, setAdjustBalanceModal] = useState<AdminUser | null>(
    null,
  );
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const { data, isLoading, refetch } = useAdminUsers({
    search: search || undefined,
    limit: LIMIT,
    offset,
  });

  const updateRoleMutation = useUpdateUserRole();
  const adjustBalanceMutation = useAdjustBalance();
  const disableMutation = useDisableUser();
  const enableMutation = useEnableUser();

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    if (!isSuperAdmin) return;
    updateRoleMutation.mutate(
      { userId, role: newRole },
      { onSuccess: () => void refetch() },
    );
  };

  const handleToggleDisable = (user: AdminUser) => {
    if (user.disabled) {
      enableMutation.mutate(user.id, { onSuccess: () => void refetch() });
    } else {
      const reason = prompt('Reason for disabling this account:');
      if (reason) {
        disableMutation.mutate(
          { userId: user.id, reason },
          { onSuccess: () => void refetch() },
        );
      }
    }
  };

  const handleAdjustBalance = () => {
    if (!adjustBalanceModal || !adjustAmount || !adjustReason) return;
    adjustBalanceMutation.mutate(
      {
        userId: adjustBalanceModal.id,
        adjustment: parseFloat(adjustAmount),
        reason: adjustReason,
      },
      {
        onSuccess: () => {
          setAdjustBalanceModal(null);
          setAdjustAmount('');
          setAdjustReason('');
          void refetch();
        },
      },
    );
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return { ...styles.roleBadge, ...styles.roleSuperAdmin };
      case 'admin':
        return { ...styles.roleBadge, ...styles.roleAdmin };
      default:
        return { ...styles.roleBadge, ...styles.roleUser };
    }
  };

  const formatRole = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      default:
        return 'User';
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  if (isLoading) {
    return <div style={styles.loading}>Loading users...</div>;
  }

  const users = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div style={styles.container}>
      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          style={styles.searchInput}
        />
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Role</th>
            <th style={styles.th}>Balance</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Created</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td style={styles.td}>{user.email}</td>
              <td style={styles.td}>
                {isSuperAdmin && user.id !== currentUser?.id ? (
                  <select
                    value={user.role}
                    onChange={(e) =>
                      handleRoleChange(user.id, e.target.value as UserRole)
                    }
                    style={styles.select}
                    disabled={updateRoleMutation.isPending}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                ) : (
                  <span style={getRoleBadgeStyle(user.role)}>
                    {formatRole(user.role)}
                  </span>
                )}
              </td>
              <td style={styles.td}>{formatCurrency(user.cashBalance)}</td>
              <td style={styles.td}>
                <span
                  style={{
                    ...styles.statusBadge,
                    ...(user.disabled
                      ? styles.statusDisabled
                      : styles.statusActive),
                  }}
                >
                  {user.disabled ? 'Disabled' : 'Active'}
                </span>
              </td>
              <td style={styles.td}>{formatDate(user.createdAt)}</td>
              <td style={styles.td}>
                <div style={styles.actions}>
                  <button
                    style={{ ...styles.actionButton, ...styles.primaryButton }}
                    onClick={() => setAdjustBalanceModal(user)}
                  >
                    Adjust $
                  </button>
                  {user.id !== currentUser?.id && (
                    <button
                      style={{
                        ...styles.actionButton,
                        ...(user.disabled
                          ? styles.successButton
                          : styles.dangerButton),
                      }}
                      onClick={() => handleToggleDisable(user)}
                      disabled={
                        disableMutation.isPending || enableMutation.isPending
                      }
                    >
                      {user.disabled ? 'Enable' : 'Disable'}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={styles.pagination}>
        <span>
          Showing {offset + 1}-{Math.min(offset + LIMIT, total)} of {total} users
        </span>
        <div style={styles.paginationButtons}>
          <button
            style={{ ...styles.actionButton, ...styles.primaryButton }}
            onClick={() => setOffset(Math.max(0, offset - LIMIT))}
            disabled={offset === 0}
          >
            Previous
          </button>
          <button
            style={{ ...styles.actionButton, ...styles.primaryButton }}
            onClick={() => setOffset(offset + LIMIT)}
            disabled={offset + LIMIT >= total}
          >
            Next
          </button>
        </div>
      </div>

      {adjustBalanceModal && (
        <div style={styles.modal} onClick={() => setAdjustBalanceModal(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              Adjust Balance - {adjustBalanceModal.email}
            </h3>
            <p style={{ color: theme.colors.textSecondary, marginBottom: theme.spacing.md }}>
              Current balance: {formatCurrency(adjustBalanceModal.cashBalance)}
            </p>
            <input
              type="number"
              placeholder="Amount (+ to add, - to subtract)"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              style={styles.modalInput}
            />
            <textarea
              placeholder="Reason for adjustment (min 10 characters)"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              style={{ ...styles.modalInput, minHeight: 80, resize: 'vertical' }}
            />
            <div style={styles.modalButtons}>
              <button
                style={{ ...styles.actionButton, backgroundColor: theme.colors.bgTertiary, color: theme.colors.textPrimary }}
                onClick={() => setAdjustBalanceModal(null)}
              >
                Cancel
              </button>
              <button
                style={{ ...styles.actionButton, ...styles.primaryButton }}
                onClick={handleAdjustBalance}
                disabled={
                  !adjustAmount ||
                  adjustReason.length < 10 ||
                  adjustBalanceMutation.isPending
                }
              >
                {adjustBalanceMutation.isPending ? 'Saving...' : 'Adjust Balance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
