/**
 * GBS LOAN MANAGEMENT SYSTEM - PERMISSIONS DOMAIN CODES
 * Standard: Node.js CommonJS
 */

const PERMISSIONS = {
  // User Management & Verification
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_VERIFY_QUALIFICATION: 'users:verify_qualification',
  USERS_LOCK: 'users:lock',
  USERS_CHANGE_ROLE: 'users:change_role',

  // Loan Processing & Underwriting
  LOANS_APPLY: 'loans:apply',
  LOANS_VIEW: 'loans:view',
  LOANS_UNDERWRITE: 'loans:underwrite',
  LOANS_APPROVE_TIER1: 'loans:approve_tier1',
  LOANS_APPROVE_TIER2: 'loans:approve_tier2',
  LOANS_DISBURSE: 'loans:disburse',
  LOANS_REJECT: 'loans:reject',
  LOANS_RESTRUCTURE: 'loans:restructure',
  LOANS_WRITE_OFF: 'loans:write_off',

  // Payments & Financials
  PAYMENTS_COLLECT: 'payments:collect',
  PAYMENTS_RECORD_CASH: 'payments:record_cash',
  PAYMENTS_MOMO_DISBURSE: 'payments:momo_disburse',
  PAYMENTS_RECONCILE: 'payments:reconcile',
  PAYMENTS_REFUND: 'payments:refund',

  // Collections & Field Tracking
  COLLECTIONS_VIEW: 'collections:view',
  COLLECTIONS_ASSIGN: 'collections:assign',
  COLLECTIONS_LOG_VISIT: 'collections:log_visit',
  COLLECTIONS_APPLY_PENALTY: 'collections:apply_penalty',
  GPS_TRACK_LIVE: 'gps:track_live',
  FIELD_OFFLINE_SYNC: 'field:offline_sync',

  // HR & Salary Grouping
  HR_VIEW_STAFF: 'hr:view_staff',
  HR_MANAGE_SALARY_GROUPS: 'hr:manage_salary_groups',
  HR_APPROVE_PAYSLIP: 'hr:approve_payslip',
  HR_ATTENDANCE: 'hr:attendance',

  // Reception
  RECEPTION_CHECK_IN: 'reception:check_in',
  RECEPTION_REQUEST_APPROVAL: 'reception:request_approval',
  RECEPTION_ISSUE_BADGE: 'reception:issue_badge',

  // Accounting & Treasury
  ACCOUNTING_POST_JOURNAL: 'accounting:post_journal',
  ACCOUNTING_VIEW_LEDGER: 'accounting:view_ledger',
  ACCOUNTING_CLOSE_PERIOD: 'accounting:close_period',
  TREASURY_TRANSFER: 'treasury:transfer',
  TREASURY_RECONCILE: 'treasury:reconcile',

  // Risk, Audit, Compliance & Fraud
  AUDIT_VIEW_LOGS: 'audit:view_logs',
  AUDIT_EXPORT: 'audit:export',
  FRAUD_FLAG_ANOMALY: 'fraud:flag_anomaly',
  COMPLIANCE_GENERATE_BOG_REPORT: 'compliance:generate_bog_report',
  RISK_VIEW_PAR_METRICS: 'risk:view_par_metrics',

  // Developer Control Center
  DEV_ACCESS_CENTER: 'dev:access_center',
  DEV_LOCK_SYSTEM: 'dev:lock_system',
  DEV_RUN_DIAGNOSTICS: 'dev:run_diagnostics',
  DEV_TRIGGER_BACKUP: 'dev:trigger_backup',
  DEV_RESTORE_BACKUP: 'dev:restore_backup',
  DEV_MAINTENANCE_MODE: 'dev:maintenance_mode',

  // Migration Engine
  MIGRATION_UPLOAD: 'migration:upload',
  MIGRATION_MAP_FIELDS: 'migration:map_fields',
  MIGRATION_PREVIEW: 'migration:preview',
  MIGRATION_EXECUTE: 'migration:execute',
  MIGRATION_ROLLBACK: 'migration:rollback',
};

module.exports = PERMISSIONS;
