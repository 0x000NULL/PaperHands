export enum AdminAuditAction {
  // Role management (SUPER_ADMIN only)
  ROLE_CHANGED = 'role_changed',

  // User management
  USER_DISABLED = 'user_disabled',
  USER_ENABLED = 'user_enabled',

  // Financial adjustments
  CASH_BALANCE_ADJUSTED = 'cash_balance_adjusted',

  // Order management
  ORDER_CANCELLED = 'order_cancelled',

  // System operations
  JOB_TRIGGERED = 'job_triggered',
}
