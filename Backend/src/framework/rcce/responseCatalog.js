/**
 * GBS Central System Response, Control and Communication Engine (GBS-RCCE)
 * Predefined Response Catalog & Standard Response Contracts
 * Standard: Node.js CommonJS
 */

const RESPONSE_CATALOG = {
  // Authentication & Session
  AUTH_LOGIN_SUCCESS: {
    status: 200,
    code: 'AUTH_LOGIN_SUCCESS',
    message: 'Signed in successfully.',
  },
  AUTH_LOGIN_FAILED: {
    status: 401,
    code: 'AUTH_LOGIN_FAILED',
    message: 'Invalid email, username or password. Please verify your credentials and try again.',
  },
  AUTH_UNAUTHORIZED: {
    status: 401,
    code: 'AUTH_UNAUTHORIZED',
    message: 'Authentication required. Please sign in to continue.',
  },
  AUTH_FORBIDDEN: {
    status: 403,
    code: 'AUTH_FORBIDDEN',
    message: 'You do not have permission to perform this operation.',
  },
  AUTH_LOGOUT_SUCCESS: {
    status: 200,
    code: 'AUTH_LOGOUT_SUCCESS',
    message: 'You have been signed out successfully.',
  },
  AUTH_OTP_SENT: {
    status: 200,
    code: 'AUTH_OTP_SENT',
    message: 'Verification code has been dispatched to your registered phone.',
  },
  AUTH_OTP_VERIFIED: {
    status: 200,
    code: 'AUTH_OTP_VERIFIED',
    message: 'Verification code confirmed successfully.',
  },
  AUTH_OTP_INVALID: {
    status: 400,
    code: 'AUTH_OTP_INVALID',
    message: 'Invalid or expired verification code. Please request a new code.',
  },
  AUTH_BIOMETRIC_SUCCESS: {
    status: 200,
    code: 'AUTH_BIOMETRIC_SUCCESS',
    message: 'Biometric verification confirmed successfully.',
  },
  AUTH_BIOMETRIC_FAILED: {
    status: 401,
    code: 'AUTH_BIOMETRIC_FAILED',
    message: 'Biometric verification match failed. Please try again or use password.',
  },

  // Registration & Onboarding
  REGISTRATION_SUCCESS: {
    status: 201,
    code: 'REGISTRATION_SUCCESS',
    message: 'Registration completed successfully.',
  },
  REGISTRATION_FAILED: {
    status: 400,
    code: 'REGISTRATION_FAILED',
    message: 'Registration could not be completed. Please review the information and try again.',
  },
  ONBOARDING_SUBMITTED: {
    status: 202,
    code: 'ONBOARDING_SUBMITTED',
    message: 'Institutional onboarding application submitted successfully and is awaiting Developer review.',
  },
  ONBOARDING_APPROVED: {
    status: 200,
    code: 'ONBOARDING_APPROVED',
    message: 'Institution approved and active trial provisioned successfully.',
  },
  ONBOARDING_REJECTED: {
    status: 200,
    code: 'ONBOARDING_REJECTED',
    message: 'Institutional application was rejected.',
  },

  // Record CRUD Operations
  RECORD_FOUND: {
    status: 200,
    code: 'RECORD_FOUND',
    message: 'Record retrieved successfully.',
  },
  RECORD_CREATED: {
    status: 201,
    code: 'RECORD_CREATED',
    message: 'Record created successfully.',
  },
  RECORD_UPDATED: {
    status: 200,
    code: 'RECORD_UPDATED',
    message: 'Your information has been updated successfully.',
  },
  RECORD_DELETED: {
    status: 200,
    code: 'RECORD_DELETED',
    message: 'Record deleted successfully.',
  },
  RECORD_NOT_FOUND: {
    status: 404,
    code: 'RECORD_NOT_FOUND',
    message: 'No matching record was found.',
  },
  RECORDS_EMPTY: {
    status: 200,
    code: 'RECORDS_EMPTY',
    message: 'No records available.',
  },

  // Transactions & Payments
  PAYMENT_RECEIVED: {
    status: 200,
    code: 'PAYMENT_RECEIVED',
    message: 'Payment received successfully.',
  },
  PAYMENT_PENDING: {
    status: 202,
    code: 'PAYMENT_PENDING',
    message: 'Payment is being processed. You will receive a confirmation shortly.',
  },
  PAYMENT_FAILED: {
    status: 400,
    code: 'PAYMENT_FAILED',
    message: 'Payment could not be processed. Please check your account and try again.',
  },
  PAYMENT_APPROVED: {
    status: 200,
    code: 'PAYMENT_APPROVED',
    message: 'Cash payment reconciled and approved successfully.',
  },
  PAYMENT_REJECTED: {
    status: 200,
    code: 'PAYMENT_REJECTED',
    message: 'Cash payment flagged and rejected.',
  },

  // Approvals & Workflow
  PENDING_APPROVAL: {
    status: 202,
    code: 'PENDING_APPROVAL',
    message: 'Your request has been submitted and is awaiting approval.',
  },
  APPROVAL_GRANTED: {
    status: 200,
    code: 'APPROVAL_GRANTED',
    message: 'Operation approved successfully.',
  },
  APPROVAL_REJECTED: {
    status: 200,
    code: 'APPROVAL_REJECTED',
    message: 'Operation rejected.',
  },

  // Validation & Data Integrity
  MISSING_INFORMATION: {
    status: 422,
    code: 'MISSING_INFORMATION',
    message: 'Some required information is missing.',
  },
  VALIDATION_FAILED: {
    status: 422,
    code: 'VALIDATION_FAILED',
    message: 'Validation failed. Please review the supplied information and try again.',
  },
  DUPLICATE_OPERATION: {
    status: 409,
    code: 'DUPLICATE_OPERATION',
    message: 'A duplicate request was detected. Operation cancelled to protect financial integrity.',
  },
  INVALID_STATE_TRANSITION: {
    status: 400,
    code: 'INVALID_STATE_TRANSITION',
    message: 'The requested status change is not permitted from the current record state.',
  },

  // System & Developer Control
  SYSTEM_LOCKED: {
    status: 423,
    code: 'SYSTEM_LOCKED',
    message: 'Platform under Lead Developer maintenance lock.',
  },
  SYSTEM_UNLOCKED: {
    status: 200,
    code: 'SYSTEM_UNLOCKED',
    message: 'Platform unlocked and normal operations resumed.',
  },
  SUBSCRIPTION_EXPIRED: {
    status: 403,
    code: 'SUBSCRIPTION_EXPIRED',
    message: 'Institution subscription or trial has expired. Contact system landlord to renew.',
  },
  BACKUP_CREATED: {
    status: 201,
    code: 'BACKUP_CREATED',
    message: 'PostgreSQL database backup snapshot generated successfully.',
  },
  BACKUP_RESTORE_VERIFIED: {
    status: 200,
    code: 'BACKUP_RESTORE_VERIFIED',
    message: 'Database backup point verified and ready for restoration.',
  },
  DIAGNOSTICS_COMPLETED: {
    status: 200,
    code: 'DIAGNOSTICS_COMPLETED',
    message: 'System diagnostics completed with full telemetry.',
  },

  // General & Technical Fallbacks
  OPERATION_SUCCESS: {
    status: 200,
    code: 'OPERATION_SUCCESS',
    message: 'Operation completed successfully.',
  },
  DATABASE_CONNECTION_ERROR: {
    status: 503,
    code: 'DATABASE_CONNECTION_ERROR',
    message: 'Live database connection unavailable. Automatic failover retry initiated.',
  },
  INTERNAL_ERROR: {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected system error occurred. Our engineering team has been notified.',
  },
};

function resolveResponse(code, customMessage = null, customStatus = null) {
  const entry = RESPONSE_CATALOG[code] || RESPONSE_CATALOG.OPERATION_SUCCESS;
  return {
    status: customStatus || entry.status || 200,
    code: entry.code,
    message: customMessage || entry.message,
  };
}

module.exports = {
  RESPONSE_CATALOG,
  resolveResponse,
};
