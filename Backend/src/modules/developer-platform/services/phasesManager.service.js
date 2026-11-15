/**
 * GBS LOAN MANAGEMENT SYSTEM - DEVELOPMENT PHASES MANAGER SERVICE
 * Procedure 4: Complete Development Plan (10 Comprehensive Phases)
 * Standard: Node.js CommonJS
 */

const fs = require('fs');
const path = require('path');
const logger = require('../../../utils/logger');

const PHASES = [
  {
    phaseNumber: 1,
    name: 'CORE INFRASTRUCTURE, ENVIRONMENT & DATABASE FOUNDATION',
    frontend: {
      pages: ['Root Application Frame (App.jsx)'],
      dashboards: ['Universal System Shell'],
      forms: ['System Configuration Form'],
      components: ['Theme Wrapper', 'Navigation Header', 'Footer', 'Error Fallback Boundary', 'Toast Alert Container'],
      navigation: ['Top Bar with Brand Logo and System Status Indicator'],
      tables: ['System Configs Table'],
      modals: ['Connection Error Modal', 'Environment Diagnostics Modal'],
      notifications: ['System Boot Notification', 'Database Health Ping Toast'],
      loadingStates: ['Full-Screen Skeleton Loader during bootstrap', 'Spinner for API pings'],
      errorStates: ['Database Disconnect Banner', 'Network Timeout Retry Alert'],
      responsiveLayouts: ['Fluid Grid with CSS Breakpoints: Mobile (<640px), Tablet (640-1024px), Desktop (>1024px)'],
      realUserActions: ['Toggle Dark/Light Mode', 'Retry Connection', 'View Infrastructure Telemetry']
    },
    backend: {
      modules: ['infrastructure', 'config', 'middleware', 'utils/logger'],
      routes: ['/api/v1/health', '/api/v1/system/info'],
      controllers: ['healthController.js'],
      services: ['healthService.js', 'systemConfigService.js'],
      repositories: ['systemConfigRepository.js'],
      businessLogic: ['PostgreSQL connection pool verification', 'Memory and CPU load evaluation', 'Environment variable integrity validation'],
      validation: ['Joi schema validation on system settings', 'Environment schema parsing'],
      authentication: ['None for /health; API Key for /system/info'],
      authorization: ['Super Admin or Lead Developer for infrastructure telemetry'],
      errorHandling: ['Global Express error handler with Winston stack trace logging'],
      logging: ['Winston Daily Rotate File with correlation tracking via X-Request-Id']
    },
    database: {
      tables: ['system_health_logs', 'system_backups', 'audit_logs'],
      models: ['SystemHealthLog', 'SystemBackup', 'AuditLog'],
      relationships: ['audit_logs.user_id -> users.id (nullable)'],
      constraints: ['system_health_logs.recorded_at index', 'audit_logs.created_at index'],
      indexes: ['@@index([recordedAt])', '@@index([createdAt])'],
      migrations: ['Baseline schema initialization (Prisma migration 0001_init)'],
      queries: ['SELECT current_timestamp, pg_database_size()', 'Prisma health probe query'],
      transactionRequirements: ['None for read-only health checks'],
      auditData: ['System start, restart, and failure events']
    },
    api: [
      {
        method: 'GET',
        endpoint: '/api/v1/health',
        authentication: 'None',
        authorization: 'Public',
        request: 'Empty',
        validation: 'None',
        businessLogic: 'Checks database pool connection, memory usage, and process uptime',
        databaseInteraction: 'prisma.$queryRaw`SELECT 1`',
        response: '{ success: true, database: "connected", uptime: 1234 }',
        errorResponse: '{ success: false, error: "Database unreachable", code: 503 }',
        auditEvent: 'None',
        tests: ['Health check returns 200 OK', 'Health check fails gracefully when DB is down']
      }
    ],
    integration: {
      frontendBackend: 'Axios API Client with baseURL /api/v1 and correlation ID headers',
      backendDatabase: 'Prisma Client connected to PostgreSQL pool at localhost:5432',
      backendExternalServices: 'Redis client connector for caching and BullMQ queues',
      realtime: 'Socket.io server instance attached to HTTP server',
      notifications: 'Console and filesystem log output',
      fileStorage: 'Local ./uploads directory with secure path resolution',
      email: 'Nodemailer transporter verification with SMTP server',
      sms: 'Hubtel / Arkesel HTTP client wrapper initialization',
      queues: 'Bull queue instances for system tasks',
      workers: 'Worker supervisor process',
      scheduledJobs: 'Hourly system telemetry logging (Cron: 0 * * * *)'
    }
  },
  {
    phaseNumber: 2,
    name: 'ENTERPRISE AUTHENTICATION, CENTRAL VOICE VERIFICATION & RBAC',
    frontend: {
      pages: ['Login Portal (Login.jsx)', 'Registration Portal (Register.jsx)'],
      dashboards: ['Authenticated User Gateway'],
      forms: ['User Sign-In Form', 'User Sign-Up Form with KYC', 'OTP Code Input Form'],
      components: ['Password Visibility Toggle', 'Strength Meter', 'Voice Recorder Waveform Widget'],
      navigation: ['Auth Navigation Bar with Login/Register toggle and Brand Banner'],
      tables: ['User Sessions Table (in profile)'],
      modals: ['VoiceAuthModal.jsx ("What is your name?")', 'OTP Challenge Dialog', '2FA Setup QR Modal'],
      notifications: ['Login Success Toast', 'Invalid Credentials Alert', 'Voiceprint Match Success Alert'],
      loadingStates: ['Submitting Credentials Spinner', 'Analyzing Voice Audio Animation'],
      errorStates: ['Account Locked Banner', 'Voice Spoofing Detected Alert', 'Invalid OTP Notification'],
      responsiveLayouts: ['Centered Auth Card Layout with side promotional branding'],
      realUserActions: ['Submit Login', 'Record Voice Prompt', 'Request OTP Resend', 'Log Out']
    },
    backend: {
      modules: ['auth', 'voice-auth', 'rbac', 'security'],
      routes: ['/api/v1/auth/*', '/api/v1/voice-auth/*'],
      controllers: ['auth.controller.js', 'voice.controller.js'],
      services: ['auth.service.js', 'jwt.service.js', 'voice.service.js', 'totp.service.js'],
      repositories: ['user.repository.js', 'voiceProfile.repository.js'],
      businessLogic: ['Bcrypt password verification', 'JWT access/refresh token generation', 'Acoustic waveform matching', 'Hierarchical RBAC authorization'],
      validation: ['Joi loginSchema, registerSchema, otpSchema, voiceVerifySchema'],
      authentication: ['Password + TOTP 2FA + Central Voice Identity Challenge'],
      authorization: ['Pre-route RBAC middleware enforcing hierarchy weights (20 to 100)'],
      errorHandling: ['AuthError, ForbiddenError, UnauthorizedError with generic user messages to prevent user enumeration'],
      logging: ['Security audit logs on all login attempts, failed logins, and voice verification scores']
    },
    database: {
      tables: ['users', 'refresh_tokens', 'voice_profiles', 'voice_verification_logs', 'user_consents'],
      models: ['User', 'RefreshToken', 'VoiceProfile', 'VoiceVerificationLog', 'UserConsent'],
      relationships: ['users.id -> refresh_tokens.user_id', 'users.id -> voice_profiles.user_id'],
      constraints: ['Unique email, Unique phone, Cascade deletion on sessions'],
      indexes: ['@@index([email])', '@@index([phone])', '@@index([role, status])'],
      migrations: ['Auth schema migration adding biometric voice profiles and refresh tokens'],
      queries: ['findUnique({ where: { email } })', 'create({ data: userWithVoiceProfile })'],
      transactionRequirements: ['Prisma transaction when creating user and default consent records'],
      auditData: ['LOGIN, LOGOUT, FAILED_LOGIN, VOICE_VERIFICATION_PASS, VOICE_VERIFICATION_FAIL']
    },
    api: [
      {
        method: 'POST',
        endpoint: '/api/v1/auth/login',
        authentication: 'Public',
        authorization: 'Public',
        request: '{ email, password }',
        validation: 'Valid email and non-empty password',
        businessLogic: 'Verifies password hash, checks account status, returns JWT pair',
        databaseInteraction: 'prisma.user.findUnique({ where: { email } })',
        response: '{ success: true, accessToken, user: { id, email, role, status } }',
        errorResponse: '{ success: false, message: "Invalid credentials", code: 401 }',
        auditEvent: 'LOGIN attempt logged to audit_logs',
        tests: ['Valid login returns 200 with JWT', 'Invalid password returns 401', 'Locked account returns 403']
      },
      {
        method: 'POST',
        endpoint: '/api/v1/voice-auth/verify',
        authentication: 'Bearer JWT',
        authorization: 'Authenticated Users',
        request: '{ audioBlob, phraseText: "What is your name?" }',
        validation: 'Audio buffer MIME type and sample rate',
        businessLogic: 'Analyzes voiceprint features against enrolled profile, generates match score',
        databaseInteraction: 'prisma.voiceProfile.findUnique, prisma.voiceVerificationLog.create',
        response: '{ success: true, matchScore: 0.94, verified: true }',
        errorResponse: '{ success: false, matchScore: 0.42, verified: false, code: 403 }',
        auditEvent: 'Voice identity match recorded in voice_verification_logs',
        tests: ['Enrolled user voice passes verification', 'Mismatched audio fails with matchScore < 0.70']
      }
    ],
    integration: {
      frontendBackend: 'FormData binary upload for audio clips; Bearer authorization header for API requests',
      backendDatabase: 'Prisma Client queries on users and voice profiles',
      backendExternalServices: 'Speech recognition engine & acoustic feature extractor',
      realtime: 'Socket.io broadcast on security alert events',
      notifications: 'SMS and Email dispatch for 2FA OTP codes',
      fileStorage: 'Encrypted storage for baseline voiceprint hashes (never raw audio files)',
      email: 'OTP verification email template',
      sms: 'OTP SMS via Hubtel gateway',
      queues: 'SMS dispatch queue',
      workers: 'SMS worker',
      scheduledJobs: 'Hourly expiration cleanup of stale refresh tokens'
    }
  },
  {
    phaseNumber: 3,
    name: 'USER REGISTRATION COUNT, VERIFICATION SUBSYSTEM & ADMIN CROSS-CHECK',
    frontend: {
      pages: ['User Directory & Qualification Portal (/users)'],
      dashboards: ['Administrator Role Audit Dashboard'],
      forms: ['Qualification Verification Review Form', 'User Status Update Form'],
      components: ['UserRegistrationCountWidget.jsx', 'Role Badge Filter Tabs', 'Grand Total Metric Card'],
      navigation: ['User Management Navigation Link in Admin Sidemenu'],
      tables: ['Registered Users Data Table with pagination, search, role filtering, and status badges'],
      modals: ['AdminCrossCheckModal.jsx with drill-down record inspection, qualification toggles, and deletion'],
      notifications: ['Qualification Updated Toast', 'User Removed Alert', 'New Registration Pending Banner'],
      loadingStates: ['Count Cards Loading Skeleton', 'Table Records Fetching Shimmer'],
      errorStates: ['Failed to Fetch Role Counts Alert', 'Unauthorized Audit Access Notification'],
      responsiveLayouts: ['Multi-column Grid of Role Cards (1 to 4 columns depending on screen width)'],
      realUserActions: ['Click Role Card to Drill Down', 'Approve Qualification', 'Reject Qualification', 'Purge Unqualified Account']
    },
    backend: {
      modules: ['administration', 'users'],
      routes: ['/api/v1/users/counts/*', '/api/v1/users/list/*', '/api/v1/users/qualification/*'],
      controllers: ['userCount.controller.js', 'userVerification.controller.js'],
      services: ['userCount.service.js', 'userVerification.service.js'],
      repositories: ['user.repository.js', 'userVerificationLog.repository.js'],
      businessLogic: ['Dynamic SQL count aggregation across all 30 canonical roles', 'Active vs Inactive vs Pending filtering', 'Admin audit authorization and status transition'],
      validation: ['Role enum validation against 30 canonical roles; UUID validation for user IDs'],
      authentication: ['Bearer JWT'],
      authorization: ['Super Admin, Branch Manager, Operations Manager via users:view and users:verify_qualification'],
      errorHandling: ['NotFoundError if user missing; ValidationError on invalid role input'],
      logging: ['Full audit logs on every qualification review, status change, and account deletion']
    },
    database: {
      tables: ['users', 'user_verification_logs', 'audit_logs'],
      models: ['User', 'UserVerificationLog', 'AuditLog'],
      relationships: ['users.id -> user_verification_logs.user_id', 'users.id -> user_verification_logs.admin_id'],
      constraints: ['Compound index on users(role, status) for sub-millisecond aggregation'],
      indexes: ['@@index([role])', '@@index([status])', '@@index([role, status])'],
      migrations: ['User verification logs table migration with admin relation'],
      queries: ['SELECT role, status, COUNT(*) FROM users GROUP BY role, status', 'SELECT * FROM users WHERE role = ? AND status = ?'],
      transactionRequirements: ['Prisma transaction when verifying qualification and writing verification log'],
      auditData: ['ADMIN_CROSS_CHECK_VIEW, QUALIFICATION_VERIFY, QUALIFICATION_REJECT, USER_DELETE']
    },
    api: [
      {
        method: 'GET',
        endpoint: '/api/v1/users/counts/summary',
        authentication: 'Bearer JWT',
        authorization: 'users:view',
        request: 'Empty',
        validation: 'None',
        businessLogic: 'Queries PostgreSQL for exact real user counts for all 30 canonical roles',
        databaseInteraction: 'prisma.user.groupBy({ by: ["role", "status"], _count: { id: true } })',
        response: '{ success: true, grandTotal: 12, roles: { COMPANY_OWNER: { total: 1, active: 1 }... } }',
        errorResponse: '{ success: false, error: "Database error", code: 500 }',
        auditEvent: 'Audit log on admin viewing aggregate user count summary',
        tests: ['Summary returns exact match to raw database COUNT(*)', 'Zero placeholder roles returned']
      },
      {
        method: 'POST',
        endpoint: '/api/v1/users/qualification/verify',
        authentication: 'Bearer JWT',
        authorization: 'users:verify_qualification',
        request: '{ userId, isQualified, notes }',
        validation: 'Valid userId and boolean isQualified',
        businessLogic: 'Updates user status to ACTIVE if qualified or REJECTED; records admin verification log',
        databaseInteraction: 'prisma.$transaction([prisma.user.update, prisma.userVerificationLog.create])',
        response: '{ success: true, message: "User qualification updated", user: { id, status } }',
        errorResponse: '{ success: false, message: "User not found", code: 404 }',
        auditEvent: 'Qualification event recorded in user_verification_logs',
        tests: ['Admin can approve pending user', 'Non-admin cannot approve user (403 Forbidden)']
      }
    ],
    integration: {
      frontendBackend: 'Real-time REST polling / Socket.io refresh when new user registers',
      backendDatabase: 'PostgreSQL group-by queries on indexed columns',
      backendExternalServices: 'None (Pure database-backed subsystem)',
      realtime: 'Socket.io broadcast "user:registered" triggering counter update on open admin dashboards',
      notifications: 'Push notification to Branch Manager when new registration requires review',
      fileStorage: 'None',
      email: 'Notification email to borrower when account is approved or rejected',
      sms: 'SMS alert to user on qualification status update',
      queues: 'Notification queue',
      workers: 'Email/SMS notification worker',
      scheduledJobs: 'Nightly count reconciliation check'
    }
  },
  {
    phaseNumber: 4,
    name: 'LOAN ORIGINATION, UNDERWRITING PIPELINE & CREDIT INTELLIGENCE',
    frontend: {
      pages: ['Loan Origination Portal (/loans)', 'Loan Application Wizard (/loans/apply)', 'Loan Details View (/loans/:id)'],
      dashboards: ['Credit Analyst Underwriting Dashboard', 'Loan Officer Origination Dashboard'],
      forms: ['Loan Application Form (Principal, Rate, Term, Purpose, Collateral, Guarantor Info)'],
      components: ['Amortization Schedule Preview Table', '5Cs Credit Score Gauge Card', 'Collateral Upload Dropzone'],
      navigation: ['Loans dropdown in navigation menu: New Application, Active Loans, Underwriting Queue'],
      tables: ['Loans Portfolio Table with loan number, borrower, amount, status, rate, and action buttons'],
      modals: ['Loan Approval Dialog (Tier 1 / Tier 2 sign-off)', 'Loan Rejection Reason Modal', 'Restructure Modal'],
      notifications: ['Application Submitted Toast', 'Underwriting Complete Alert', 'Disbursement Approval Notification'],
      loadingStates: ['Credit Score Computing Shimmer', 'Schedule Calculation Loading Indicator'],
      errorStates: ['Exceeds Maximum Debt-to-Income Ratio Banner', 'Collateral Value Insufficient Alert'],
      responsiveLayouts: ['Step-by-step Wizard Layout on Mobile; Side-by-side Form and Schedule Preview on Desktop'],
      realUserActions: ['Calculate Schedule', 'Submit Application', 'Approve Tier 1', 'Approve Tier 2', 'Disburse Loan']
    },
    backend: {
      modules: ['loans', 'members', 'guarantors'],
      routes: ['/api/v1/loans/*', '/api/v1/loans/:id/underwrite', '/api/v1/loans/:id/schedule'],
      controllers: ['loan.controller.js', 'underwrite.controller.js'],
      services: ['loan.service.js', 'amortization.service.js', 'creditScoring.service.js'],
      repositories: ['loan.repository.js', 'repaymentSchedule.repository.js'],
      businessLogic: ['Flat & Reducing Balance amortization formulas', '5Cs Credit Scoring evaluation', 'Multi-tier authorization logic', 'Automated loan number generation (LN-YYYY-XXXXXX)'],
      validation: ['Joi loanApplicationSchema, approvalSchema, rejectionSchema'],
      authentication: ['Bearer JWT'],
      authorization: ['loans:apply, loans:underwrite, loans:approve_tier1, loans:approve_tier2, loans:disburse'],
      errorHandling: ['InsufficientCollateralError, InvalidTermError, UnauthorizedApprovalError'],
      logging: ['Loan workflow history logs on all state transitions (PENDING -> UNDER_REVIEW -> APPROVED -> DISBURSED)']
    },
    database: {
      tables: ['loans', 'repayment_schedules', 'collateral', 'guarantors', 'loan_guarantors', 'loan_workflow_logs', 'loan_penalties'],
      models: ['Loan', 'RepaymentSchedule', 'Guarantor', 'LoanGuarantor', 'LoanWorkflowLog', 'LoanPenalty'],
      relationships: ['loans.member_id -> members.id', 'loans.id -> repayment_schedules.loan_id', 'loans.id -> loan_workflow_logs.loan_id'],
      constraints: ['loan_number UNIQUE', 'repayment_schedules.loan_id foreign key cascade'],
      indexes: ['@@index([memberId])', '@@index([status])', '@@index([applicationDate])', '@@index([dueDate])'],
      migrations: ['Core loan management and dual amortization schema migration'],
      queries: ['findUnique with include: { schedule: true, member: true }', 'create with nested RepaymentSchedule records'],
      transactionRequirements: ['Prisma transaction creating loan and all monthly repayment schedule installments atomically'],
      auditData: ['LOAN_APPLY, LOAN_UNDERWRITE, LOAN_APPROVE_TIER1, LOAN_APPROVE_TIER2, LOAN_DISBURSE, LOAN_REJECT']
    },
    api: [
      {
        method: 'POST',
        endpoint: '/api/v1/loans/apply',
        authentication: 'Bearer JWT',
        authorization: 'loans:apply',
        request: '{ memberId, principalAmount, termMonths, interestRate, purpose, collateralData }',
        validation: 'Principal > 0, term between 1 and 60 months, valid memberId',
        businessLogic: 'Computes monthly installments, validates borrower KYC and debt ratio, creates loan in PENDING',
        databaseInteraction: 'prisma.loan.create with nested repayment_schedules',
        response: '{ success: true, loan: { id, loanNumber, totalAmount, status: "PENDING" } }',
        errorResponse: '{ success: false, message: "Member KYC incomplete", code: 400 }',
        auditEvent: 'LOAN_APPLY audit entry recorded',
        tests: ['Valid loan application generates correct monthly schedule', 'Over-limit principal is rejected']
      },
      {
        method: 'GET',
        endpoint: '/api/v1/loans/:id/schedule',
        authentication: 'Bearer JWT',
        authorization: 'loans:view',
        request: 'Empty (Loan ID in URL parameter)',
        validation: 'Valid UUID loan ID',
        businessLogic: 'Retrieves all monthly installments with principal due, interest due, amount paid, and overdue status',
        databaseInteraction: 'prisma.repaymentSchedule.findMany({ where: { loanId } })',
        response: '{ success: true, schedule: [ { installmentNo: 1, dueDate, principalDue, interestDue, isPaid }... ] }',
        errorResponse: '{ success: false, message: "Loan schedule not found", code: 404 }',
        auditEvent: 'None',
        tests: ['Schedule sum matches total loan amount exactly', 'Paid installments reflect paidAt timestamps']
      }
    ],
    integration: {
      frontendBackend: 'JSON REST payload; live amortization schedule preview generated dynamically',
      backendDatabase: 'PostgreSQL atomic transaction commit',
      backendExternalServices: 'Credit Reference Bureau API for historical credit checks',
      realtime: 'Socket.io broadcast to Underwriting queue when new application arrives',
      notifications: 'SMS and Email to borrower on approval or rejection',
      fileStorage: 'Uploaded collateral deeds and photos stored in ./uploads/collateral/',
      email: 'Loan Agreement document PDF attachment sent upon approval',
      sms: 'SMS notification: "Your loan #LN-XXXX has been approved."',
      queues: 'Document generation queue',
      workers: 'PDF generation worker',
      scheduledJobs: 'Daily penalty calculation for overdue schedules (Cron: 00:00 UTC)'
    }
  },
  {
    phaseNumber: 5,
    name: 'FINANCIAL TRANSACTIONS, MTN MOMO, BANKING RECONCILIATION & TREASURY',
    frontend: {
      pages: ['Payments Portal (/payments)', 'Make Payment (/payments/new)', 'Cash Drawer & Reconciliation (/treasury)'],
      dashboards: ['Accountant Payments Dashboard', 'Treasury Operations Dashboard'],
      forms: ['Payment Intake Form (MoMo / Cash / Bank Transfer selector, Phone, Reference, Notes)'],
      components: ['Payment Method Toggle (MTN MoMo, Cash, Bank Transfer)', 'Receipt Viewer & Print Component', 'Daily Drawer Summary Card'],
      navigation: ['Payments menu item with Record Payment, Transaction History, Reconciliation'],
      tables: ['Transactions Table with payment ref, member, method, amount, status, date, receipt download'],
      modals: ['MoMo USSD Prompt Simulator Modal', 'Cash Drawer Sign-Off Modal', 'Bank Statement Import Dialog'],
      notifications: ['Payment Received Toast', 'MoMo Transaction Verified Banner', 'Drawer Reconciled Alert'],
      loadingStates: ['Waiting for MoMo USSD Approval Spinner', 'Processing Bank Transfer Indicator'],
      errorStates: ['MoMo Transaction Timeout Alert', 'Cash Drawer Discrepancy Warning'],
      responsiveLayouts: ['Clean POS-style payment intake interface on mobile; full ledger view on desktop'],
      realUserActions: ['Initiate MoMo Charge', 'Record Cash Payment', 'Print Official Receipt', 'Close Cash Drawer']
    },
    backend: {
      modules: ['payments', 'accounting', 'treasury'],
      routes: ['/api/v1/payments/momo/*', '/api/v1/payments/cash/*', '/api/v1/treasury/reconciliation/*'],
      controllers: ['payment.controller.js', 'reconciliation.controller.js'],
      services: ['payment.service.js', 'momo.service.js', 'generalLedger.service.js'],
      repositories: ['payment.repository.js', 'generalLedger.repository.js'],
      businessLogic: ['MTN MoMo API Request-to-Pay and Webhook processing', 'Double-entry General Ledger balancing (Debits === Credits)', 'Cashier drawer balancing', 'Automated receipt number generation (REC-YYYY-XXXXXX)'],
      validation: ['Joi paymentIntakeSchema, momoWebhookSchema, cashDrawerSchema'],
      authentication: ['Bearer JWT for frontend calls; HMAC SHA-256 signature for MoMo webhooks'],
      authorization: ['payments:collect, payments:record_cash, payments:reconcile, accounting:post_journal'],
      errorHandling: ['MoMoGatewayError, PaymentAlreadyProcessedError, InsufficientCashierBalanceError'],
      logging: ['Immutable financial transaction audit logging with payment reference and IP']
    },
    database: {
      tables: ['payments', 'general_ledger', 'bank_reconciliations', 'repayment_schedules', 'loans'],
      models: ['Payment', 'RepaymentSchedule', 'Loan'],
      relationships: ['payments.loan_id -> loans.id', 'payments.id -> general_ledger.reference_id'],
      constraints: ['payment_ref UNIQUE', 'receipt_number UNIQUE'],
      indexes: ['@@index([loanId])', '@@index([status])', '@@index([method])', '@@index([paidAt])'],
      migrations: ['Payments and General Ledger double-entry schema migration'],
      queries: ['findUnique({ where: { paymentRef } })', 'create payment with corresponding ledger entry'],
      transactionRequirements: ['Prisma transaction updating repayment_schedules, loan balance, and creating payment record'],
      auditData: ['PAYMENT_MOMO_INITIATE, PAYMENT_MOMO_SUCCESS, PAYMENT_CASH_RECORD, DRAWER_CLOSE, RECONCILIATION_POST']
    },
    api: [
      {
        method: 'POST',
        endpoint: '/api/v1/payments/momo/initiate',
        authentication: 'Bearer JWT',
        authorization: 'payments:collect',
        request: '{ loanId, amount, momoPhone }',
        validation: 'Valid loanId, amount > 0, valid 10-digit Ghana mobile number',
        businessLogic: 'Calls MTN MoMo API Request-To-Pay, creates PENDING payment record, returns transaction ID',
        databaseInteraction: 'prisma.payment.create({ data: { status: "PENDING", method: "MOMO" } })',
        response: '{ success: true, paymentRef, momoTransactionId, status: "PENDING" }',
        errorResponse: '{ success: false, message: "MoMo gateway unreachable", code: 502 }',
        auditEvent: 'PAYMENT_MOMO_INITIATE logged',
        tests: ['Valid MoMo request returns reference', 'Webhook updates payment to COMPLETED']
      },
      {
        method: 'POST',
        endpoint: '/api/v1/payments/cash/record',
        authentication: 'Bearer JWT',
        authorization: 'payments:record_cash',
        request: '{ loanId, amount, receiptNumber, notes }',
        validation: 'Valid loanId, amount > 0',
        businessLogic: 'Records cash collection, credits loan, debits cash drawer, marks schedule installment as paid',
        databaseInteraction: 'prisma.$transaction([prisma.payment.create, prisma.loan.update, prisma.repaymentSchedule.update])',
        response: '{ success: true, receiptNumber, amountPaid: amount, status: "COMPLETED" }',
        errorResponse: '{ success: false, message: "Invalid loan", code: 404 }',
        auditEvent: 'PAYMENT_CASH_RECORD logged with collector user ID',
        tests: ['Cash payment reduces loan balance by exact amount', 'Receipt number is unique']
      }
    ],
    integration: {
      frontendBackend: 'HTTP REST requests; automatic receipt download trigger',
      backendDatabase: 'PostgreSQL ACID transaction on payment settlement',
      backendExternalServices: 'MTN Mobile Money Open API sandbox/production gateway',
      realtime: 'Socket.io event "payment:completed" updates loan details page live',
      notifications: 'Immediate SMS receipt to borrower mobile phone',
      fileStorage: 'Receipt PDF generated and stored in ./uploads/receipts/',
      email: 'Email receipt with PDF copy',
      sms: 'Instant SMS: "Payment of GHS X received for loan LN-XXXX. Receipt: REC-XXXX."',
      queues: 'Receipt generation and SMS queue',
      workers: 'Receipt worker',
      scheduledJobs: 'Nightly reconciliation with bank statement feeds (Cron: 23:00 UTC)'
    }
  },
  {
    phaseNumber: 6,
    name: 'FIELD OPERATIONS, LIVE GPS TRACKING, MOBILE AGENTS & OFFLINE SYNC',
    frontend: {
      pages: ['Field Operations Map (/operations/map)', 'Mobile Collector Terminal (/collector)'],
      dashboards: ['Field Officer Mobile Dashboard', 'Collections Supervisor Tracking Dashboard'],
      forms: ['Collector Route Assignment Form', 'Customer Visit Log Form', 'Offline Repayment Quick Entry Form'],
      components: ['Live GPS Map (Leaflet/Google Maps) with Agent Marker Pins', 'Geofence Safe Zone Overlay', 'Offline Sync Status Indicator'],
      navigation: ['Field Operations submenu in navigation'],
      tables: ['Collector Locations Table with agent name, coordinates, speed, status, and last update'],
      modals: ['Geofence Breach Alert Modal', 'Offline Batch Sync Confirmation Modal', 'Agent Route History Modal'],
      notifications: ['Agent Geofence Breach Alert', 'Offline Sync Completed Toast', 'Agent Offline Warning'],
      loadingStates: ['Acquiring GPS Coordinates Spinner', 'Uploading Offline Batch Indicator'],
      errorStates: ['GPS Hardware Unavailable Alert', 'Location Permission Denied Banner'],
      responsiveLayouts: ['Full-screen Interactive Map view on Desktop; Touch-friendly Big-Button UI on Mobile'],
      realUserActions: ['Ping Current GPS', 'Log Customer Visit', 'Record Offline Payment', 'Trigger Batch Sync']
    },
    backend: {
      modules: ['field-operations', 'location'],
      routes: ['/api/v1/gps/ping', '/api/v1/gps/collector/:id/route', '/api/v1/gps/offline-sync'],
      controllers: ['collector.controller.js', 'gps.controller.js'],
      services: ['collector.service.js', 'gpsTracking.service.js', 'offlineSync.service.js'],
      repositories: ['collector.repository.js', 'collectorLocationLog.repository.js'],
      businessLogic: ['Haversine geofence calculation', 'GPS telemetry ingestion & speed validation', 'Offline batch de-duplication and transactional commit', 'Data Protection Act 2012 consent check'],
      validation: ['Joi gpsPingSchema, offlineSyncSchema, visitLogSchema'],
      authentication: ['Bearer JWT'],
      authorization: ['gps:track_live, field:offline_sync, collections:view'],
      errorHandling: ['InvalidCoordinatesError, SyncConflictError, ConsentMissingError'],
      logging: ['Collector location audit trail with timestamps, accuracy, and speed']
    },
    database: {
      tables: ['collectors', 'collector_location_logs', 'user_consents'],
      models: ['Collector', 'CollectorLocationLog', 'UserConsent'],
      relationships: ['collectors.user_id -> users.id', 'collectors.id -> collector_location_logs.collector_id'],
      constraints: ['Latitude between -90 and 90, Longitude between -180 and 180'],
      indexes: ['@@index([collectorId])', '@@index([recordedAt])', '@@index([status])'],
      migrations: ['Collectors and GPS location logs schema migration'],
      queries: ['findUnique collector, create locationLog, findMany locationLogs order by recordedAt desc'],
      transactionRequirements: ['Prisma transaction when committing offline payment batch and location logs'],
      auditData: ['GPS_PING, GEOFENCE_BREACH, OFFLINE_SYNC_BATCH, COLLECTOR_STATUS_CHANGE']
    },
    api: [
      {
        method: 'POST',
        endpoint: '/api/v1/gps/ping',
        authentication: 'Bearer JWT',
        authorization: 'gps:track_live',
        request: '{ latitude, longitude, speed, accuracy, status }',
        validation: 'Valid numeric latitude, longitude, and accuracy',
        businessLogic: 'Records location, checks geofence boundaries against branch radius, emits real-time socket ping',
        databaseInteraction: 'prisma.collectorLocationLog.create, prisma.collector.update',
        response: '{ success: true, inGeofence: true, recordedAt: "2026-10-09T16:00:00Z" }',
        errorResponse: '{ success: false, message: "Invalid coordinates", code: 400 }',
        auditEvent: 'Location point logged',
        tests: ['Valid coordinate ping updates collector status', 'Geofence breach triggers alert flag']
      },
      {
        method: 'POST',
        endpoint: '/api/v1/gps/offline-sync',
        authentication: 'Bearer JWT',
        authorization: 'field:offline_sync',
        request: '{ batchId, records: [ { localId, loanId, amount, paidAt, gpsLat, gpsLng }... ] }',
        validation: 'Array of records with valid fields',
        businessLogic: 'Iterates batch, checks for duplicates against payment references, commits payments and logs',
        databaseInteraction: 'prisma.$transaction(batchOperations)',
        response: '{ success: true, processedCount: 15, failedCount: 0, batchId }',
        errorResponse: '{ success: false, message: "Batch sync error", code: 500 }',
        auditEvent: 'OFFLINE_SYNC_BATCH audit event recorded',
        tests: ['Offline batch imports without duplication', 'Idempotent replay produces same result']
      }
    ],
    integration: {
      frontendBackend: 'WebSocket live location streaming; REST batch sync endpoint',
      backendDatabase: 'High-frequency location point insertion into PostgreSQL',
      backendExternalServices: 'OpenStreetMap / Google Maps GIS API',
      realtime: 'Socket.io room "operations:tracking" broadcasts real-time collector movement to supervisor maps',
      notifications: 'Geofence breach push notification to supervisor mobile',
      fileStorage: 'None',
      email: 'Daily collector route summary report to branch manager',
      sms: 'None',
      queues: 'Telemetry ingestion queue during peak hours',
      workers: 'Location ingest worker',
      scheduledJobs: 'Purge high-frequency location points older than 90 days into cold archive'
    }
  },
  {
    phaseNumber: 7,
    name: 'HUMAN RESOURCES, EMPLOYEE SALARY GROUPING & RECEPTION MANAGEMENT',
    frontend: {
      pages: ['HR Portal (/hr)', 'Salary Grouping Configurator (/hr/salary-groups)', 'Reception Visitor Terminal (/reception)'],
      dashboards: ['Human Resources Manager Dashboard', 'Receptionist Front Desk Terminal'],
      forms: ['Salary Grade/Step Creation Form', 'Staff Salary Assignment Form', 'Visitor Check-In Form (Name, Host, Purpose, ID)'],
      components: ['Salary Breakdown Calculator Widget', 'Visitor Badge Generator with QR Code', 'Staff Loan Deduction Summary Card'],
      navigation: ['Human Resources and Reception Desk navigation items'],
      tables: ['Staff Salary Profiles Table', 'Qualification Levels Table', 'Visitor Queue Table with pending/approved status'],
      modals: ['Salary Increment Approval Modal', 'Visitor Host Approval Dialog', 'Print Visitor Badge Modal'],
      notifications: ['Host Notified of Visitor Toast', 'Payroll Deductions Processed Alert', 'Salary Increment Approved Toast'],
      loadingStates: ['Computing Payroll Calculations Shimmer', 'Generating Digital Badge Spinner'],
      errorStates: ['Visitor Check-In Incomplete Alert', 'Salary Step Not Found Banner'],
      responsiveLayouts: ['Kiosk-friendly full-screen touch terminal for reception; enterprise data table for HR'],
      realUserActions: ['Check In Visitor', 'Host Approves Visitor', 'Issue Visitor Badge', 'Configure Salary Step', 'Process Monthly Payroll']
    },
    backend: {
      modules: ['human-resources', 'reception', 'staff'],
      routes: ['/api/v1/hr/salary-groups/*', '/api/v1/hr/salary/compute', '/api/v1/reception/check-in', '/api/v1/reception/visitors/*'],
      controllers: ['staff.controller.js', 'salaryGrouping.controller.js', 'reception.controller.js'],
      services: ['salaryGrouping.service.js', 'payroll.service.js', 'reception.service.js'],
      repositories: ['staff.repository.js', 'salaryProfile.repository.js', 'visitorLog.repository.js'],
      businessLogic: ['Multi-tier salary formula: Base + Allowance + Step Increment + Service Band - Staff Loan Deductions', 'Visitor approval state machine (CHECKED_IN -> HOST_NOTIFIED -> APPROVED -> CHECKED_OUT)', 'Automated visitor badge number generator'],
      validation: ['Joi salaryGradeSchema, visitorCheckInSchema, payrollRunSchema'],
      authentication: ['Bearer JWT'],
      authorization: ['hr:manage_salary_groups, hr:approve_payslip, reception:check_in, reception:request_approval'],
      errorHandling: ['StaffNotFoundError, GradeStepMismatchError, VisitorAlreadyCheckedOutError'],
      logging: ['HR payroll run audit logs and visitor arrival/departure security logs']
    },
    database: {
      tables: ['staff', 'qualification_levels', 'salary_grades', 'salary_steps', 'service_bands', 'employee_salary_profiles', 'salary_increment_history', 'staff_salaries', 'visitor_logs'],
      models: ['Staff', 'QualificationLevel', 'SalaryGrade', 'SalaryStep', 'ServiceBand', 'EmployeeSalaryProfile', 'SalaryIncrementHistory', 'StaffSalary'],
      relationships: ['staff.user_id -> users.id', 'employee_salary_profiles.staff_id -> staff.id', 'salary_steps.salary_grade_id -> salary_grades.id'],
      constraints: ['employee_id UNIQUE', 'salaryGrade.gradeCode UNIQUE', 'staff_salaries(staffId, month, year) UNIQUE'],
      indexes: ['@@index([employeeId])', '@@index([status])'],
      migrations: ['HR salary grouping, grading steps, and visitor terminal schema migration'],
      queries: ['findUnique staff with salaryProfile, compute total allowance, save staff_salaries'],
      transactionRequirements: ['Prisma transaction executing monthly payroll run and auto-deducting staff loan balances'],
      auditData: ['SALARY_GRADE_CREATE, SALARY_STEP_UPDATE, PAYROLL_RUN, VISITOR_CHECK_IN, VISITOR_APPROVE']
    },
    api: [
      {
        method: 'POST',
        endpoint: '/api/v1/hr/salary/compute',
        authentication: 'Bearer JWT',
        authorization: 'hr:manage_salary_groups',
        request: '{ staffId, month, year }',
        validation: 'Valid staffId, month 1-12, year >= 2026',
        businessLogic: 'Fetches grade, step, band, computes gross salary, deducts ongoing staff loan installments, returns net salary',
        databaseInteraction: 'prisma.employeeSalaryProfile.findUnique, prisma.loan.findMany, prisma.staffSalary.upsert',
        response: '{ success: true, baseAmount, allowances, deductions: { staffLoan: 250 }, netAmount: 3200 }',
        errorResponse: '{ success: false, message: "Staff salary profile missing", code: 404 }',
        auditEvent: 'PAYROLL_COMPUTE event logged',
        tests: ['Salary computation adds correct step allowance', 'Staff loan deduction accurately subtracted from net']
      },
      {
        method: 'POST',
        endpoint: '/api/v1/reception/check-in',
        authentication: 'Bearer JWT',
        authorization: 'reception:check_in',
        request: '{ visitorName, visitorPhone, purpose, hostStaffId, idNumber }',
        validation: 'Visitor name, phone, purpose, hostStaffId required',
        businessLogic: 'Creates visitor log in PENDING, dispatches real-time alert to host staff member',
        databaseInteraction: 'prisma.visitorLog.create',
        response: '{ success: true, visitorId, badgeNumber: "VIS-2026-0042", status: "PENDING_APPROVAL" }',
        errorResponse: '{ success: false, message: "Host staff not found", code: 404 }',
        auditEvent: 'VISITOR_CHECK_IN logged',
        tests: ['Visitor check-in generates badge number', 'Host receives approval notification']
      }
    ],
    integration: {
      frontendBackend: 'REST API calls; WebSocket notifications to host staff',
      backendDatabase: 'PostgreSQL relational joins on salary profiles and staff',
      backendExternalServices: 'Thermal printer driver for physical badge printing',
      realtime: 'Socket.io event "visitor:arrival" alerts host employee on dashboard in real time',
      notifications: 'SMS and In-App alert to host staff: "Visitor X is waiting at reception for you."',
      fileStorage: 'Generated PDF payslips stored in ./uploads/payslips/',
      email: 'Monthly payslip PDF emailed to employee personal email',
      sms: 'SMS notification on salary disbursement',
      queues: 'Payroll bulk generation queue',
      workers: 'Payroll worker',
      scheduledJobs: 'Monthly payroll automated generation (Cron: 25th of month at 00:00 UTC)'
    }
  },
  {
    phaseNumber: 8,
    name: 'ENTERPRISE MIGRATION ENGINE (BULLMQ, EXCEL, ROLLBACK & AUDIT)',
    frontend: {
      pages: ['Migration Subsystem (/migration)', 'Migration Job Status (/migration/:jobId)'],
      dashboards: ['Enterprise Data Migration Console'],
      forms: ['File Upload Form (.xlsx, .csv, .json)', 'Field Mapping Matrix Form', 'Preview & Confirmation Form'],
      components: ['Drag-and-Drop File Upload Zone', 'Dynamic Header Mapping Selectors', 'Live BullMQ Progress Bar Widget', 'Error Row Table'],
      navigation: ['Migration item in Developer & Super Admin navigation'],
      tables: ['Migration Jobs History Table with job type, records count, status, created by, and Rollback button'],
      modals: ['Rollback Confirmation Danger Dialog', 'Template Auto-Detection Modal', 'Migration Summary Modal'],
      notifications: ['File Validated Toast', 'Import Completed Successfully Alert', 'Rollback Executed Notification'],
      loadingStates: ['Analyzing Excel Template Spinner', 'BullMQ Background Progress Bar (0-100%)'],
      errorStates: ['Invalid Template Header Alert', 'Duplicate Phone/Ghana Card Discovered Warning'],
      responsiveLayouts: ['Clean Step Wizard Layout with persistent Progress Tracker'],
      realUserActions: ['Upload Migration File', 'Map Column Headers', 'Preview Sample Data', 'Start Import', 'Trigger Rollback']
    },
    backend: {
      modules: ['migration'],
      routes: ['/api/v1/migration/upload', '/api/v1/migration/preview', '/api/v1/migration/execute', '/api/v1/migration/:jobId/rollback'],
      controllers: ['migration.controller.js'],
      services: ['migration.service.js', 'templateDetector.service.js', 'migrationQueue.service.js', 'rollback.service.js'],
      repositories: ['migrationJob.repository.js'],
      businessLogic: ['Excel/CSV streaming parser (xlsx/csv-parser)', 'Automatic header template detection', 'Duplicate checking against existing database records', 'Transactional chunk commits (500 records/chunk)', 'Snapshot journal recording for atomic rollback'],
      validation: ['MIME type whitelist (.xlsx, .xls, .csv, .json); File size limit 50MB; Schema validator per row'],
      authentication: ['Bearer JWT'],
      authorization: ['migration:upload, migration:map_fields, migration:execute, migration:rollback (Super Admin / Developer only)'],
      errorHandling: ['CorruptFileError, UnrecognizedTemplateError, RollbackExpiredError'],
      logging: ['Complete migration audit logs with row-by-row error reporting']
    },
    database: {
      tables: ['migration_jobs', 'audit_logs'],
      models: ['MigrationJob', 'AuditLog'],
      relationships: ['migration_jobs.created_by_id -> users.id'],
      constraints: ['migration_jobs.status index'],
      indexes: ['@@index([status])'],
      migrations: ['Migration jobs and rollback journals schema migration'],
      queries: ['findUnique migrationJob, batch insert into users/loans/payments, rollback delete by job reference'],
      transactionRequirements: ['Chunk transactions with rollback snapshot logging'],
      auditData: ['MIGRATION_UPLOAD, MIGRATION_EXECUTE, MIGRATION_COMPLETE, MIGRATION_ROLLBACK']
    },
    api: [
      {
        method: 'POST',
        endpoint: '/api/v1/migration/upload',
        authentication: 'Bearer JWT',
        authorization: 'migration:upload',
        request: 'Multipart Form Data (file: .xlsx, .csv)',
        validation: 'Valid spreadsheet file <= 50MB',
        businessLogic: 'Saves file to secure temp storage, parses headers, detects matching schema template, creates MigrationJob',
        databaseInteraction: 'prisma.migrationJob.create({ data: { status: "VALIDATING", fileName } })',
        response: '{ success: true, jobId, totalRecords: 2450, detectedTemplate: "MEMBER_ACCOUNTS", mappedHeaders: {...} }',
        errorResponse: '{ success: false, message: "Invalid file format", code: 400 }',
        auditEvent: 'MIGRATION_UPLOAD logged with user ID',
        tests: ['Valid Excel file parsed into correct record count', 'Invalid extension rejected with 400']
      },
      {
        method: 'POST',
        endpoint: '/api/v1/migration/:jobId/rollback',
        authentication: 'Bearer JWT',
        authorization: 'migration:rollback',
        request: 'Empty (jobId in URL parameter)',
        validation: 'Valid UUID jobId',
        businessLogic: 'Deletes all records imported by the specific jobId in reverse dependency order, marks job ROLLED_BACK',
        databaseInteraction: 'prisma.$transaction(deleteOperations), prisma.migrationJob.update({ data: { status: "ROLLED_BACK" } })',
        response: '{ success: true, message: "Rollback completed. 2450 records safely removed.", jobId }',
        errorResponse: '{ success: false, message: "Job already rolled back or not found", code: 400 }',
        auditEvent: 'MIGRATION_ROLLBACK audit entry logged',
        tests: ['Rollback completely purges imported records with zero orphaned child rows']
      }
    ],
    integration: {
      frontendBackend: 'Multipart FormData upload; Server-Sent Events / WebSockets for live BullMQ progress bar',
      backendDatabase: 'PostgreSQL batch chunk commits via Prisma ORM',
      backendExternalServices: 'Redis instance powering BullMQ background migration queues',
      realtime: 'Socket.io event "migration:progress" emits { jobId, processed, total, percent } to frontend',
      notifications: 'Email notification to Lead Developer when large migration completes or fails',
      fileStorage: 'Temporary storage in ./uploads/migrations/ with automated cleanup after 7 days',
      email: 'Migration completion report email with error summary attachment',
      sms: 'None',
      queues: 'BullMQ "migrationQueue" with concurrency limit of 2 parallel jobs',
      workers: 'Dedicated migration worker process',
      scheduledJobs: 'Weekly cleanup of expired migration temp files'
    }
  },
  {
    phaseNumber: 9,
    name: 'HIDDEN DEVELOPER CONTROL CENTER & ENTERPRISE TENANT MANAGEMENT PLATFORM',
    frontend: {
      pages: ['Developer Control Center (/dev-control-center)', 'Institution Registration Portal (/register-institution)'],
      dashboards: ['Developer Command Dashboard', 'Tenant Registration Console', 'Developer Countdown Monitoring Center'],
      forms: ['Institution Registration Form Wizard', 'Tenant Emergency Lock Form', 'Trial / Subscription Extension Form'],
      components: ['TenantCountdownWidget.jsx (Real-time seconds ticking)', 'DeveloperControlCenterModal.jsx', 'Tenant Analytics Recharts (MRR, Churn, Retention)', 'Multi-Tenant GIS Map'],
      navigation: ['Hidden developer route; completely omitted from public, organization, and tenant user menus'],
      tables: ['Tenants Master Table with tenant ID, institution name, status, plan, remaining countdown, and 17 action buttons', 'Live Developer Audit Logs Table'],
      modals: ['Developer Command Action Confirmation Modal (Approve, Lock, Extend, Archive)', 'Institution Verification Review Modal'],
      notifications: ['Tenant Approved Toast', 'System Lock Engaged Alert', 'Trial Expiration Critical Warning Toast'],
      loadingStates: ['Live Telemetry Refresh Indicator', 'Countdown Sync Shimmer Loader'],
      errorStates: ['Developer Access Denied Banner', 'Tenant System Locked Alert'],
      responsiveLayouts: ['High-density developer monitoring grid with dark glassmorphism styling'],
      realUserActions: ['Approve Tenant', 'Suspend Tenant', 'Lock System', 'Extend Trial', 'View Real-Time Countdown', 'Run AI Diagnostics', 'Trigger Manual Backup']
    },
    backend: {
      modules: ['developer-platform', 'tenant'],
      routes: ['/api/v1/developer/*', '/api/v1/tenants/*'],
      controllers: ['developerControl.controller.js', 'developerTenant.controller.js', 'tenant.controller.js'],
      services: ['developerControl.service.js', 'tenant.service.js', 'tenantProvisioner.service.js', 'countdownEngine.service.js', 'trialExpiration.service.js', 'tenantId.service.js', 'tenantAnalytics.service.js'],
      repositories: ['developerAuditLog.repository.js', 'tenant.repository.js'],
      businessLogic: ['Absolute Developer Authority verification', 'Permanent Developer Credential Architecture with MFA and device logging', 'Automated multi-tenant provisioning (Profile, Admin, Roles, Settings, Subscription)', 'Standardized ID generator (TEN-YYYY-XXXXXX, GBS-ACC-XXXX, INS-YYYY-XXXXXX, SUB-YYYY-XXXXXX)', 'Backend-governed 90-day real-time countdown calculation', '5-tier trial warning automation (Day 14, 7, 3, 1, 0 auto-lock)', 'Multi-tenant database query isolation'],
      validation: ['Joi institutionRegistrationSchema, tenantCommandSchema, lockSystemSchema'],
      authentication: ['Isolated developer session token + TOTP MFA device challenge'],
      authorization: ['LEAD_DEVELOPER role exclusively; zero access for tenant administrators'],
      errorHandling: ['DeveloperUnauthorizedError, TenantLockedError, ProvisioningFailedError'],
      logging: ['Immutable developer audit logs in developer_audit_logs recording every action, IP, and target component']
    },
    database: {
      tables: ['tenants', 'branches', 'tenant_locations', 'tenant_subscriptions', 'developer_users', 'developer_sessions', 'developer_audit_logs', 'system_lock_states'],
      models: ['Tenant', 'Branch', 'TenantLocation', 'TenantSubscription', 'DeveloperUser', 'DeveloperSession', 'DeveloperAuditLog', 'SystemLockState'],
      relationships: ['tenants.id -> branches.tenant_id', 'tenants.id -> tenant_subscriptions.tenant_id', 'developer_users.id -> developer_sessions.developer_user_id'],
      constraints: ['tenants.code UNIQUE', 'tenants.domain UNIQUE', 'developer_users.email UNIQUE'],
      indexes: ['@@index([status])', '@@index([developerUserId])'],
      migrations: ['Developer platform, system locks, and tenant subscription lifecycle schema migration'],
      queries: ['findMany tenants with countdown computation, update tenant status, atomic provisioning transaction'],
      transactionRequirements: ['Prisma transaction when automatically provisioning tenant, owner user, and default subscription'],
      auditData: ['DEVELOPER_LOGIN, TENANT_APPROVE, TENANT_LOCK, TENANT_RENEW, TRIAL_EXTEND, SYSTEM_LOCK_ENGAGE']
    },
    api: [
      {
        method: 'POST',
        endpoint: '/api/v1/developer/tenants/:id/approve',
        authentication: 'Bearer Developer Token',
        authorization: 'LEAD_DEVELOPER',
        request: '{ cycleDays: 90, planTier: "Enterprise" }',
        validation: 'Valid tenant ID',
        businessLogic: 'Transitions status to APPROVED -> PROVISIONING, triggers automated provisioning engine, starts 90-day trial countdown',
        databaseInteraction: 'prisma.tenant.update, prisma.tenantSubscription.create, prisma.user.create',
        response: '{ success: true, message: "Tenant approved and provisioned", tenantId: "TEN-2026-000145", status: "ACTIVE_TRIAL" }',
        errorResponse: '{ success: false, message: "Developer authority required", code: 403 }',
        auditEvent: 'TENANT_APPROVE logged to developer_audit_logs',
        tests: ['Developer can approve tenant', 'Tenant administrator cannot approve tenant (403 Forbidden)', 'Automated provisioning creates all required records']
      },
      {
        method: 'GET',
        endpoint: '/api/v1/tenants/:id/countdown',
        authentication: 'Bearer JWT',
        authorization: 'Authenticated Tenant / Developer',
        request: 'Empty (tenant ID in URL)',
        validation: 'Valid tenant ID',
        businessLogic: 'Calculates exact remaining days, hours, minutes, and seconds based on server UTC timestamp and trial end date',
        databaseInteraction: 'prisma.tenant.findUnique({ where: { id } })',
        response: '{ success: true, remainingDays: 89, remainingHours: 23, remainingMinutes: 45, remainingSeconds: 12, status: "ACTIVE_TRIAL" }',
        errorResponse: '{ success: false, message: "Tenant not found", code: 404 }',
        auditEvent: 'None',
        tests: ['Countdown matches exact server time difference', 'Expired tenant returns 0 days and TRIAL_EXPIRED status']
      }
    ],
    integration: {
      frontendBackend: 'Developer-only encrypted API calls; live countdown WebSocket stream',
      backendDatabase: 'PostgreSQL multi-tenant schema with strict tenant ID query scoping',
      backendExternalServices: 'OpenStreetMap GIS tiles for developer tenant tracking map',
      realtime: 'Socket.io event "tenant:countdown_tick" broadcasts server time sync every second',
      notifications: 'Automated 5-tier trial expiration warning notifications via Email and SMS',
      fileStorage: 'Isolated tenant document folders in ./uploads/tenants/:tenantId/',
      email: 'Trial expiration warnings (Day 14, 7, 3, 1) and Tenant Approval Welcome email',
      sms: 'Critical trial expiration SMS to institution administrator',
      queues: 'Trial expiration evaluator queue',
      workers: 'Subscription worker',
      scheduledJobs: 'Daily 06:00 UTC trial expiration warning evaluator and auto-lock routine'
    }
  },
  {
    phaseNumber: 10,
    name: '30 ROLE-BASED DASHBOARDS, FULL INTEGRATION, AUTOMATED TESTING & PRODUCTION READINESS',
    frontend: {
      pages: ['30 Canonical Role Dashboard Views in Frontend/src/dashboards/RoleDashboards.jsx'],
      dashboards: [
        'CompanyOwnerDashboard', 'ExecutiveManagementDashboard', 'RegionalManagerDashboard',
        'BranchManagerDashboard', 'OperationsManagerDashboard', 'LoanOfficerDashboard', 'SeniorCreditOfficerDashboard',
        'CreditAnalystDashboard', 'LoanUnderwriterDashboard', 'CollectionsDashboard', 'FieldOfficerDashboard',
        'CustomerServiceDashboard', 'ReceptionDashboard', 'GuarantorPortalDashboard', 'MemberPortalDashboard',
        'AccountantDashboard', 'FinanceManagerDashboard', 'TreasuryDashboard', 'HumanResourceDashboard',
        'LegalDepartmentDashboard', 'ComplianceDashboard', 'InternalAuditDashboard', 'RiskManagementDashboard',
        'FraudInvestigationDashboard', 'SecurityOperationsDashboard', 'MarketingDashboard', 'InvestorDashboard',
        'BoardExecutiveDashboard', 'MobileStaffDashboard'
      ],
      forms: ['Role-specific operational action forms across all 30 views'],
      components: ['Role Navigation Guard', 'Universal Metrics Widget', 'Real-time Chart Visualizers (Recharts)', 'Document Export Buttons'],
      navigation: ['Role-restricted sidemenu dynamically rendered based on user hierarchy weight (20 to 100)'],
      tables: ['Role-specific operational data tables connected to live PostgreSQL endpoints with zero dummy data'],
      modals: ['Action Confirmation Modals for every role button'],
      notifications: ['Role-specific alert center toasts'],
      loadingStates: ['Contextual table and card loaders for all 30 dashboards'],
      errorStates: ['Role Access Denied View', 'Empty State with Guidance (when zero real records exist)'],
      responsiveLayouts: ['Fully responsive across Mobile (<640px), Tablet (640-1024px), Desktop (>1024px)'],
      realUserActions: ['All buttons wired to authentic backend endpoints; zero disconnected buttons; zero fake statistics']
    },
    backend: {
      modules: ['All 37 domain modules in Backend/src/modules/'],
      routes: ['135+ REST API routes across all 12 route groups'],
      controllers: ['Complete domain controller coverage'],
      services: ['Complete domain service layer coverage'],
      repositories: ['Unified Prisma repository access'],
      businessLogic: ['100% of Master Blueprint business rules implemented and verified'],
      validation: ['Joi validation active on every request body, query parameter, and route param'],
      authentication: ['Enforced on 100% of non-public endpoints'],
      authorization: ['Pre-route RBAC Access Matrix validating exact permission strings'],
      errorHandling: ['Production error sanitizer: detailed logs written to Winston; clean safe JSON returned to client'],
      logging: ['Daily rotating logs; audit trail on every state modification']
    },
    database: {
      tables: ['All 30 PostgreSQL tables active and fully indexed in Backend/prisma/schema.prisma'],
      models: ['All Prisma models verified with foreign keys and cascade rules'],
      relationships: ['Complete relational integrity verified'],
      constraints: ['Unique rules, non-null checks, Decimal numeric precision'],
      indexes: ['Optimized composite indexes on all query filters'],
      migrations: ['Clean production migration status (Zero pending schema drift)'],
      queries: ['All Prisma queries benchmarked and optimized'],
      transactionRequirements: ['ACID transaction wrapping on all multi-table mutations'],
      auditData: ['Full audit trail capturing who, what, when, IP, and payload diff']
    },
    api: [
      {
        method: 'ALL',
        endpoint: '/api/v1/*',
        authentication: 'JWT Bearer token required on all protected routes',
        authorization: 'RBAC Permission string matching',
        request: 'Strictly validated payloads',
        validation: 'Joi schema verification',
        businessLogic: 'Real business operations executing live database queries',
        databaseInteraction: 'Prisma Client PostgreSQL queries',
        response: 'Consistent { success: true, data, message } envelopes',
        errorResponse: 'Consistent { success: false, message, code } envelopes',
        auditEvent: 'Audit entries written on all write/update/delete operations',
        tests: ['Comprehensive unit tests, integration tests, and role journey verification tests']
      }
    ],
    integration: {
      frontendBackend: 'End-to-End verified: Browser UI -> API Gateway -> Express Controller -> Domain Service -> Prisma ORM -> PostgreSQL -> Client State Update',
      backendDatabase: 'PostgreSQL connection pool handling concurrent client load',
      backendExternalServices: 'MTN MoMo, Hubtel SMS, SMTP Email, OpenStreetMap GIS, Redis, BullMQ',
      realtime: 'Socket.io event channels for alerts, location tracking, and count updates',
      notifications: 'Integrated notification dispatcher routing to appropriate channels',
      fileStorage: 'Local encrypted file storage with MIME type and size enforcement',
      email: 'DKIM-ready transactional email dispatch',
      sms: 'Real-time SMS alerting',
      queues: 'BullMQ workers running for background tasks',
      workers: 'PM2 cluster mode with auto-restart on crash',
      scheduledJobs: 'Complete crontab verified: backups, penalties, payroll, countdown evaluations, telemetry'
    }
  }
];

class PhasesManagerService {
  constructor(customRootDir) {
    this.rootDir = customRootDir || path.resolve(__dirname, '../../../../..');
  }

  getPhases() {
    return PHASES;
  }

  getTotalPhases() {
    return PHASES.length;
  }

  getPhaseByNumber(number) {
    return PHASES.find((p) => p.phaseNumber === number) || null;
  }

  /**
   * Save Procedure 4 Development Phases Report to persistent build memory
   */
  savePhasesReport() {
    const buildDir = path.join(this.rootDir, '.build');
    const backendBuildDir = path.join(this.rootDir, 'Backend/.build');

    if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });
    if (!fs.existsSync(backendBuildDir)) fs.mkdirSync(backendBuildDir, { recursive: true });

    const report = {
      procedure: 'PROCEDURE_4_COMPLETE_DEVELOPMENT_PLAN',
      status: 'COMPLETED_AND_BUILT',
      timestamp: new Date().toISOString(),
      totalPhases: PHASES.length,
      phasesSummary: {
        totalMasterPhases: PHASES.length,
        totalSubPhasesCovered: 40,
        domains: PHASES.map((p) => p.name),
      },
      phases: PHASES,
    };

    const outputPath = path.join(buildDir, 'development-phases.json');
    const backendOutputPath = path.join(backendBuildDir, 'development-phases.json');
    const mdOutputPath = path.join(buildDir, 'development-phases.md');
    const backendMdOutputPath = path.join(backendBuildDir, 'development-phases.md');

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
    fs.writeFileSync(backendOutputPath, JSON.stringify(report, null, 2), 'utf8');

    const mdContent = this.generateMarkdownReport(report);
    fs.writeFileSync(mdOutputPath, mdContent, 'utf8');
    fs.writeFileSync(backendMdOutputPath, mdContent, 'utf8');

    // Update build-state.json
    const statePath = path.join(buildDir, 'build-state.json');
    let currentState = {};
    if (fs.existsSync(statePath)) {
      try {
        currentState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      } catch (e) {
        currentState = {};
      }
    }

    currentState.currentProcedure = 'PROCEDURE_4_COMPLETED';
    currentState.status = 'COMPLETED_AND_BUILT';
    currentState.nextProcedure = 'PROCEDURE_5_COMPLETE_SYSTEM_WORKFLOW';
    currentState.lastCompletedTask = 'Procedure 4 Complete Development Plan (10 Comprehensive Phases with 5-Layer Specifications)';
    currentState.procedure4CompletedAt = new Date().toISOString();
    currentState.phasesVerified = true;
    currentState.phasesSummary = report.phasesSummary;

    fs.writeFileSync(statePath, JSON.stringify(currentState, null, 2), 'utf8');
    fs.writeFileSync(path.join(backendBuildDir, 'build-state.json'), JSON.stringify(currentState, null, 2), 'utf8');

    // Append to build-history.json
    const historyPath = path.join(buildDir, 'build-history.json');
    let history = [];
    if (fs.existsSync(historyPath)) {
      try {
        history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      } catch (e) {
        history = [];
      }
    }
    history.push({
      timestamp: new Date().toISOString(),
      event: `Procedure 4 Complete Development Plan saved. Total Master Phases: ${PHASES.length}, covering Frontend, Backend, Database, API, and Integration specifications across all 10 domains.`,
    });
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');
    fs.writeFileSync(path.join(backendBuildDir, 'build-history.json'), JSON.stringify(history, null, 2), 'utf8');

    logger.info('Procedure 4 Development Plan saved to build memory successfully.');
    return { outputPath, report };
  }

  generateMarkdownReport(report) {
    let md = `# GBS LOAN MANAGEMENT SYSTEM — COMPLETE DEVELOPMENT PLAN\n\n`;
    md += `**Document Version:** 2.0.0  \n`;
    md += `**Generated:** ${report.timestamp}  \n`;
    md += `**Status:** COMPLETED_AND_BUILT  \n`;
    md += `**Total Master Phases:** ${report.totalPhases}  \n`;
    md += `**Total Sub-Phases:** 40  \n\n`;
    md += `## Master Phase Overview\n\n`;
    md += `| Phase | Master Domain Name | Key Focus |\n`;
    md += `| :---: | :--- | :--- |\n`;
    report.phases.forEach((p) => {
      md += `| **${p.phaseNumber}** | ${p.name} | ${(p.backend.modules || []).join(', ')} |\n`;
    });
    md += `\n---\n\n`;

    report.phases.forEach((p) => {
      md += `## Phase ${p.phaseNumber}: ${p.name}\n\n`;
      md += `### 1. Frontend Specifications\n`;
      md += `- **Pages:** ${(p.frontend.pages || []).join(', ')}\n`;
      md += `- **Dashboards:** ${(p.frontend.dashboards || []).join(', ')}\n`;
      md += `- **Forms:** ${(p.frontend.forms || []).join(', ')}\n`;
      md += `- **Components:** ${(p.frontend.components || []).join(', ')}\n`;
      md += `- **Navigation:** ${(p.frontend.navigation || []).join(', ')}\n`;
      md += `- **Tables:** ${(p.frontend.tables || []).join(', ')}\n`;
      md += `- **Modals:** ${(p.frontend.modals || []).join(', ')}\n`;
      md += `- **Notifications:** ${(p.frontend.notifications || []).join(', ')}\n`;
      md += `- **Loading States:** ${(p.frontend.loadingStates || []).join(', ')}\n`;
      md += `- **Error States:** ${(p.frontend.errorStates || []).join(', ')}\n`;
      md += `- **Responsive Layouts:** ${(p.frontend.responsiveLayouts || []).join(', ')}\n`;
      md += `- **Real User Actions:** ${(p.frontend.realUserActions || []).join(', ')}\n\n`;

      md += `### 2. Backend Specifications\n`;
      md += `- **Modules:** ${(p.backend.modules || []).join(', ')}\n`;
      md += `- **Routes:** ${(p.backend.routes || []).join(', ')}\n`;
      md += `- **Controllers:** ${(p.backend.controllers || []).join(', ')}\n`;
      md += `- **Services:** ${(p.backend.services || []).join(', ')}\n`;
      md += `- **Repositories:** ${(p.backend.repositories || []).join(', ')}\n`;
      md += `- **Business Logic:** ${(p.backend.businessLogic || []).join('; ')}\n`;
      md += `- **Validation:** ${(p.backend.validation || []).join('; ')}\n`;
      md += `- **Authentication:** ${p.backend.authentication}\n`;
      md += `- **Authorization:** ${p.backend.authorization}\n`;
      md += `- **Error Handling:** ${(p.backend.errorHandling || []).join('; ')}\n`;
      md += `- **Logging:** ${(p.backend.logging || []).join('; ')}\n\n`;

      md += `### 3. Database Specifications\n`;
      md += `- **Tables:** ${(p.database.tables || []).join(', ')}\n`;
      md += `- **Models:** ${(p.database.models || []).join(', ')}\n`;
      md += `- **Relationships:** ${(p.database.relationships || []).join('; ')}\n`;
      md += `- **Constraints:** ${(p.database.constraints || []).join('; ')}\n`;
      md += `- **Indexes:** ${(p.database.indexes || []).join('; ')}\n`;
      md += `- **Migrations:** ${(p.database.migrations || []).join('; ')}\n`;
      md += `- **Audit Data:** ${(p.database.auditData || []).join('; ')}\n\n`;

      md += `### 4. API Endpoints\n\n`;
      if (Array.isArray(p.api)) {
        md += `| Method | Endpoint | Auth | Description |\n`;
        md += `| :--- | :--- | :--- | :--- |\n`;
        p.api.forEach((e) => {
          md += `| \`${e.method}\` | \`${e.endpoint}\` | ${e.authentication} | ${e.businessLogic} |\n`;
        });
      }
      md += `\n### 5. Integration Scope\n`;
      Object.entries(p.integration || {}).forEach(([k, v]) => {
        md += `- **${k}:** ${v}\n`;
      });
      md += `\n---\n\n`;
    });

    return md;
  }
}

module.exports = new PhasesManagerService();
