/**
 * Authoritative Frontend Role Capabilities Matrix
 * Mirrors Backend roleCapabilities.js so every role (29 tenant roles + Developer Authority)
 * sees ONLY its exact permitted tabs, commands, actions, KPIs, and activity stream.
 */

const ROLE_CANONICAL_MAP = {
  MANAGER: 'BRANCH_MANAGER',
  STAFF: 'FIELD_OFFICER',
  COLLECTOR: 'COLLECTIONS',
  MEMBER: 'MEMBER_PORTAL',
  GUARANTOR: 'GUARANTOR_PORTAL',
  DEVELOPER: 'DEVELOPER_LANDLORD',
  LEAD_DEVELOPER: 'DEVELOPER_LANDLORD',
  SYSTEM_DEVELOPER: 'DEVELOPER_LANDLORD',
};

const ALL_FALSE = {
  canViewOverviewMetrics: false,
  canViewSelfOverview: false,
  canViewCharts: false,
  canApplyLoan: false,
  canViewGuaranteedLoans: false,
  canReviewLoan: false,
  canApproveLoan: false,
  canDisburseLoan: false,
  canCloseLoan: false,
  canRecordPayment: false,
  canApproveCash: false,
  canRegisterMember: false,
  canVerifyKyc: false,
  canViewCustomerDirectory: false,
  canViewCollectionAlerts: false,
  canManageGuarantors: false,
  canSignOwnGuarantee: false,
  canLogFieldVisit: false,
  canShareGps: false,
  canCreateStaff: false,
  canApproveStaff: false,
  canManagePayroll: false,
  canViewSalaries: false,
  canRunAudit: false,
  canSignOffAudit: false,
  canManageBranding: false,
  canManageSubscriptions: false,
  canManageCctv: false,
  canManageCases: false,
  canManageTickets: false,
  canManageCampaigns: false,
  canManageInvestors: false,
  canBroadcastStaff: false,
  canScheduleMeetings: false,
  canExportReports: false,
  canRequestDeletion: false,
  canApproveDeletion: false,
  canViewCountsDropdown: false,
  canUseDataMigration: false,
  canApproveTenants: false,
  canManagePlatform: false,
};

const FULL_MGMT = {
  canViewOverviewMetrics: true,
  canViewCharts: true,
  canApplyLoan: true,
  canReviewLoan: true,
  canApproveLoan: true,
  canDisburseLoan: true,
  canCloseLoan: true,
  canRecordPayment: true,
  canApproveCash: true,
  canRegisterMember: true,
  canVerifyKyc: true,
  canViewCustomerDirectory: true,
  canViewCollectionAlerts: true,
  canManageGuarantors: true,
  canLogFieldVisit: true,
  canShareGps: true,
  canCreateStaff: true,
  canApproveStaff: true,
  canManagePayroll: true,
  canViewSalaries: true,
  canRunAudit: true,
  canSignOffAudit: true,
  canManageBranding: true,
  canManageSubscriptions: true,
  canManageCctv: true,
  canManageCases: true,
  canManageTickets: true,
  canManageCampaigns: true,
  canManageInvestors: true,
  canBroadcastStaff: true,
  canScheduleMeetings: true,
  canExportReports: true,
  canRequestDeletion: true,
  canApproveDeletion: true,
  canViewCountsDropdown: true,
  canUseDataMigration: true,
};

function makeCaps(allowedTabs, actions = {}, allowedActionsList = [], scopeSummary = '') {
  return {
    allowedTabs,
    actions: { ...ALL_FALSE, ...actions },
    allowedActionsList,
    scopeSummary,
  };
}

export const FRONTEND_ROLE_CAPABILITIES = {
  COMPANY_OWNER: makeCaps(
    ['OVERVIEW', 'LOANS', 'PAYMENTS', 'MEMBERS', 'GUARANTORS', 'FIELD_OPS', 'HR_PAYROLL', 'ACCOUNTING_AUDIT', 'BRANDING_CCTV', 'RISK_AUDIT', 'SUPPORT', 'GROWTH_CAPITAL', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    FULL_MGMT,
    ['Institution Branding & Plans', 'Approve Staff Access', 'Final Loan Approval & Disbursement', 'Accountant Audit Sign-Off', 'Staff Broadcast & CCTV', 'Export Executive Reports'],
    'Full Institutional Owner governance within your Developer-approved organization. New tenant approvals remain exclusive to GBS Developer Authority.'
  ),
  EXECUTIVE_MANAGEMENT: makeCaps(
    ['OVERVIEW', 'LOANS', 'PAYMENTS', 'MEMBERS', 'GUARANTORS', 'FIELD_OPS', 'HR_PAYROLL', 'ACCOUNTING_AUDIT', 'BRANDING_CCTV', 'RISK_AUDIT', 'SUPPORT', 'GROWTH_CAPITAL', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    FULL_MGMT,
    ['Executive Portfolio Governance', 'Approve & Disburse Loans', 'Sign Off Ledger Audits', 'Manage Branding & Subscriptions', 'Schedule Executive Briefings'],
    'C-Suite institutional governance and cross-department supervision.'
  ),
  BOARD_EXECUTIVE: makeCaps(
    ['OVERVIEW', 'LOANS', 'ACCOUNTING_AUDIT', 'RISK_AUDIT', 'GROWTH_CAPITAL', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    {
      canViewOverviewMetrics: true, canViewCharts: true, canApproveLoan: true, canSignOffAudit: true,
      canViewSalaries: true, canManageCases: true, canManageInvestors: true, canBroadcastStaff: true,
      canScheduleMeetings: true, canExportReports: true, canViewCountsDropdown: true,
    },
    ['Boardroom Portfolio KPIs', 'High-Value Facility Sign-Off', 'Inspect & Sign Off Financial Audits', 'Review Compliance & Capital Yield', 'Export Board Reports'],
    'Board Governance Oversight: Day-to-day teller entry, customer intake, and branding edits are excluded.'
  ),
  REGIONAL_MANAGER: makeCaps(
    ['OVERVIEW', 'LOANS', 'PAYMENTS', 'MEMBERS', 'GUARANTORS', 'FIELD_OPS', 'HR_PAYROLL', 'ACCOUNTING_AUDIT', 'RISK_AUDIT', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    {
      canViewOverviewMetrics: true, canViewCharts: true, canReviewLoan: true, canApproveLoan: true,
      canDisburseLoan: true, canCloseLoan: true, canApproveCash: true, canViewCustomerDirectory: true,
      canViewCollectionAlerts: true, canViewSalaries: true, canManageCases: true, canBroadcastStaff: true,
      canScheduleMeetings: true, canExportReports: true, canApproveDeletion: true, canViewCountsDropdown: true,
    },
    ['Multi-Branch Loan Approvals & Disbursements', 'Approve Cash Receipts', 'Regional Collector GPS Oversight', 'Review Deletion & Compliance Cases'],
    'Regional multi-branch management scope.'
  ),
  BRANCH_MANAGER: makeCaps(
    ['OVERVIEW', 'LOANS', 'PAYMENTS', 'MEMBERS', 'GUARANTORS', 'FIELD_OPS', 'HR_PAYROLL', 'ACCOUNTING_AUDIT', 'BRANDING_CCTV', 'RISK_AUDIT', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    { ...FULL_MGMT, canApproveStaff: false, canSignOffAudit: false, canManageCampaigns: false, canManageInvestors: false },
    ['Approve & Disburse Branch Loans', 'Approve Cash Collections', 'Create Branch Staff (Pending Owner Approval)', 'Branch Attendance & CCTV Oversight'],
    'Branch Management scope: final staff activation and accountant sign-off stay with Company Owner.'
  ),
  OPERATIONS_MANAGER: makeCaps(
    ['OVERVIEW', 'LOANS', 'PAYMENTS', 'MEMBERS', 'GUARANTORS', 'FIELD_OPS', 'HR_PAYROLL', 'ACCOUNTING_AUDIT', 'BRANDING_CCTV', 'RISK_AUDIT', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    { ...FULL_MGMT, canApproveStaff: false, canSignOffAudit: false, canManageCampaigns: false, canManageInvestors: false },
    ['End-to-End Loan Operations', 'Approve Deletion Requests', 'Manage Data Migrations', 'Dispatch Field Collectors'],
    'Operational workflow, SLA fulfillment, and deletion governance scope.'
  ),
  LOAN_OFFICER: makeCaps(
    ['OVERVIEW', 'LOANS', 'MEMBERS', 'GUARANTORS', 'FIELD_OPS', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    {
      canViewOverviewMetrics: true, canViewCharts: true, canApplyLoan: true, canReviewLoan: true,
      canRegisterMember: true, canVerifyKyc: true, canViewCustomerDirectory: true, canViewCollectionAlerts: true,
      canManageGuarantors: true, canLogFieldVisit: true, canShareGps: true, canRequestDeletion: true, canExportReports: true,
    },
    ['Onboard Borrowers & Verify KYC', 'Register Guarantors with GPS', 'Originate & Tier-1 Review Loans', 'Residence Verification Map & Field Visits'],
    'Credit Origination scope: Final loan approvals, fund disbursements, HR payroll, and accounting audits are excluded.'
  ),
  SENIOR_CREDIT_OFFICER: makeCaps(
    ['OVERVIEW', 'LOANS', 'MEMBERS', 'GUARANTORS', 'FIELD_OPS', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    {
      canViewOverviewMetrics: true, canViewCharts: true, canApplyLoan: true, canReviewLoan: true,
      canApproveLoan: true, canRegisterMember: true, canVerifyKyc: true, canViewCustomerDirectory: true,
      canViewCollectionAlerts: true, canManageGuarantors: true, canExportReports: true,
    },
    ['Credit Committee Appraisal', 'Approve Qualified Loan Applications', 'Inspect Borrower KYC & Guarantors', 'Export Credit Reports'],
    'Senior Credit Underwriting scope.'
  ),
  CREDIT_ANALYST: makeCaps(
    ['OVERVIEW', 'LOANS', 'MEMBERS', 'GUARANTORS', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    {
      canViewOverviewMetrics: true, canViewCharts: true, canReviewLoan: true, canApproveLoan: true,
      canVerifyKyc: true, canViewCustomerDirectory: true, canExportReports: true,
    },
    ['5Cs Credit Risk Scoring', 'Underwriting Review & Credit Sign-Off', 'Verify Borrower KYC'],
    'Credit Risk Analysis scope: cash collection, payroll, and branding controls are excluded.'
  ),
  LOAN_UNDERWRITER: makeCaps(
    ['OVERVIEW', 'LOANS', 'MEMBERS', 'GUARANTORS', 'FIELD_OPS', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    {
      canViewOverviewMetrics: true, canViewCharts: true, canReviewLoan: true, canApproveLoan: true,
      canVerifyKyc: true, canViewCustomerDirectory: true, canManageGuarantors: true, canExportReports: true,
    },
    ['Collateral & Surety Verification', 'Underwriting Approval Sign-Off', 'Field Residence Inspection'],
    'Underwriting scope: fund disbursement and payroll controls are excluded.'
  ),
  COLLECTIONS: makeCaps(
    ['OVERVIEW', 'LOANS', 'PAYMENTS', 'MEMBERS', 'GUARANTORS', 'FIELD_OPS', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    {
      canViewOverviewMetrics: true, canRecordPayment: true, canViewCustomerDirectory: true,
      canViewCollectionAlerts: true, canLogFieldVisit: true, canShareGps: true,
    },
    ['Track Overdue Installments', 'Record Field MoMo / Cash Repayments', 'Log GPS Field Recovery Visits', 'Contact Borrowers & Guarantors'],
    'Recovery & Field Collections scope: Loan origination, approvals, cash approval, and HR payroll are excluded.'
  ),
  FIELD_OFFICER: makeCaps(
    ['OVERVIEW', 'LOANS', 'PAYMENTS', 'MEMBERS', 'GUARANTORS', 'FIELD_OPS', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    {
      canViewOverviewMetrics: true, canRecordPayment: true, canRegisterMember: true, canVerifyKyc: true,
      canViewCustomerDirectory: true, canViewCollectionAlerts: true, canManageGuarantors: true, canLogFieldVisit: true, canShareGps: true,
    },
    ['On-Site Borrower KYC & GPS Check-Ins', 'Register Field Borrowers & Guarantors', 'Record Field Collections', 'Log Field Visit Reports'],
    'Field Operations scope.'
  ),
  MOBILE_STAFF: makeCaps(
    ['OVERVIEW', 'LOANS', 'PAYMENTS', 'MEMBERS', 'GUARANTORS', 'FIELD_OPS', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    {
      canViewOverviewMetrics: true, canRecordPayment: true, canViewCustomerDirectory: true,
      canViewCollectionAlerts: true, canLogFieldVisit: true, canShareGps: true,
    },
    ['Mobile Field GPS Sync', 'Quick MoMo / Cash Posting', 'Log Mobile Route Visits'],
    'Mobile Route Operations scope.'
  ),
  CUSTOMER_SERVICE: makeCaps(
    ['OVERVIEW', 'SUPPORT', 'MEMBERS', 'LOANS', 'PAYMENTS', 'STAFF_COMMS'],
    { canManageTickets: true, canRegisterMember: true, canViewCustomerDirectory: true, canViewCollectionAlerts: true },
    ['Manage Borrower Support Queue', 'Walk-In Borrower KYC Assistance', 'Read-Only Loan & Repayment Status Check'],
    'Customer Service Helpdesk: Loan underwriting approvals, disbursements, accounting audits, and payroll are excluded.'
  ),
  RECEPTION: makeCaps(
    ['OVERVIEW', 'SUPPORT', 'MEMBERS', 'LOANS', 'STAFF_COMMS'],
    { canManageTickets: true, canRegisterMember: true, canViewCustomerDirectory: true },
    ['Log Front-Desk Visitor Tickets', 'Initial Borrower Intake Registration', 'Check Loan Application Status'],
    'Front-Desk Intake scope: Payment posting, approvals, audits, and HR payroll are excluded.'
  ),
  GUARANTOR_PORTAL: makeCaps(
    ['OVERVIEW', 'GUARANTORS', 'LOANS', 'PAYMENTS'],
    { canViewSelfOverview: true, canViewGuaranteedLoans: true, canSignOwnGuarantee: true, canRecordPayment: true },
    ['Sign My Digital Surety Agreement', 'Configure Penalty SMS Alerts', 'Inspect Guaranteed Loans & Schedules', 'Make Surety Repayment'],
    'Guarantor Self-Service Portal: Shows strictly your own surety obligations, guaranteed facilities, and your surety payments.'
  ),
  MEMBER_PORTAL: makeCaps(
    ['OVERVIEW', 'LOANS', 'PAYMENTS'],
    { canViewSelfOverview: true, canApplyLoan: true, canRecordPayment: true },
    ['Apply for Personal / SME Loan', 'Inspect My Schedules & Balances', 'Pay Installments (MoMo / Bank / Cash)', 'Security & Face/Voice ID'],
    'Borrower Self-Service Portal: Shows strictly your own loan facilities, payment receipts, and account activity.'
  ),
  ACCOUNTANT: makeCaps(
    ['OVERVIEW', 'ACCOUNTING_AUDIT', 'PAYMENTS', 'LOANS', 'HR_PAYROLL', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    {
      canViewOverviewMetrics: true, canViewCharts: true, canApproveLoan: true, canDisburseLoan: true,
      canRecordPayment: true, canApproveCash: true, canViewSalaries: true, canRunAudit: true, canExportReports: true, canUseDataMigration: true,
    },
    ['Run Pesewa-Accurate Ledger Reconciliation', 'Approve & Reconcile Cash Payments', 'Disburse Approved Facilities', 'Inspect Salary Ledger & Export Statements'],
    'Accounting & Ledger Control scope: Marketing campaigns, support desk, and field borrower intake are excluded.'
  ),
  FINANCE_MANAGER: makeCaps(
    ['OVERVIEW', 'ACCOUNTING_AUDIT', 'PAYMENTS', 'LOANS', 'HR_PAYROLL', 'GROWTH_CAPITAL', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    {
      canViewOverviewMetrics: true, canViewCharts: true, canApproveLoan: true, canDisburseLoan: true,
      canRecordPayment: true, canApproveCash: true, canManagePayroll: true, canViewSalaries: true,
      canRunAudit: true, canManageInvestors: true, canExportReports: true, canUseDataMigration: true,
    },
    ['Authorize Loan Disbursements', 'Reconcile General Ledger & Cash', 'Generate & Disburse Staff Payroll', 'Manage Investor Capital Tranches'],
    'Finance & Capital Management scope.'
  ),
  TREASURY: makeCaps(
    ['OVERVIEW', 'ACCOUNTING_AUDIT', 'PAYMENTS', 'LOANS', 'GROWTH_CAPITAL', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    {
      canViewOverviewMetrics: true, canViewCharts: true, canApproveLoan: true, canDisburseLoan: true,
      canRecordPayment: true, canApproveCash: true, canRunAudit: true, canManageInvestors: true, canExportReports: true,
    },
    ['Treasury Float & Bank Transfers', 'Approve Cash Settlements', 'Disburse Approved Loans', 'Manage Investor Funding Pools'],
    'Treasury & Liquidity Management scope.'
  ),
  HUMAN_RESOURCE: makeCaps(
    ['OVERVIEW', 'HR_PAYROLL', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    { canCreateStaff: true, canManagePayroll: true, canViewSalaries: true, canViewCountsDropdown: true, canExportReports: true },
    ['Create Staff (Queued for Owner Approval)', 'Qualification Cross-Check & Salary Grading', 'Monitor Staff Clock-In / Clock-Out', 'Generate Monthly Staff Payroll'],
    'Human Resources & Payroll scope: Borrower KYC ledgers, loan approvals, and compliance cases are excluded.'
  ),
  LEGAL_DEPARTMENT: makeCaps(
    ['OVERVIEW', 'RISK_AUDIT', 'ACCOUNTING_AUDIT', 'LOANS', 'PAYMENTS', 'MEMBERS', 'GUARANTORS', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    { canViewOverviewMetrics: true, canViewCustomerDirectory: true, canManageCases: true, canExportReports: true },
    ['File & Resolve Legal Recovery Cases', 'Inspect Loan Contracts & Guarantors', 'Audit Ledger Findings & Export Trail'],
    'Legal Counsel scope: Read-only access to loans/guarantors plus full Legal Case lifecycle.'
  ),
  COMPLIANCE: makeCaps(
    ['OVERVIEW', 'RISK_AUDIT', 'ACCOUNTING_AUDIT', 'LOANS', 'PAYMENTS', 'MEMBERS', 'GUARANTORS', 'FIELD_OPS', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    { canViewOverviewMetrics: true, canViewCharts: true, canVerifyKyc: true, canViewCustomerDirectory: true, canManageCases: true, canViewCountsDropdown: true, canExportReports: true },
    ['Open & Resolve KYC / AML Cases', 'Verify Ghana Card Compliance', 'Inspect Immutable Audit Trail & Export BoG Reports'],
    'Regulatory Compliance scope: No loan origination or cash disbursement buttons shown.'
  ),
  INTERNAL_AUDIT: makeCaps(
    ['OVERVIEW', 'RISK_AUDIT', 'ACCOUNTING_AUDIT', 'LOANS', 'PAYMENTS', 'MEMBERS', 'GUARANTORS', 'FIELD_OPS', 'HR_PAYROLL', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    { canViewOverviewMetrics: true, canViewCharts: true, canViewCustomerDirectory: true, canViewSalaries: true, canRunAudit: true, canManageCases: true, canViewCountsDropdown: true, canExportReports: true },
    ['Run Independent Ledger Audits', 'Sample Loans, Repayments & Payrolls (Read-Only)', 'File Audit Control Findings & Export Logs'],
    'Independent Internal Audit Assurance: Strictly non-transactional verification & audit reporting.'
  ),
  RISK_MANAGEMENT: makeCaps(
    ['OVERVIEW', 'RISK_AUDIT', 'ACCOUNTING_AUDIT', 'LOANS', 'PAYMENTS', 'MEMBERS', 'GUARANTORS', 'FIELD_OPS', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    { canViewOverviewMetrics: true, canViewCharts: true, canReviewLoan: true, canApproveLoan: true, canViewCustomerDirectory: true, canViewCollectionAlerts: true, canManageCases: true, canViewCountsDropdown: true, canExportReports: true },
    ['Evaluate Portfolio PAR & Credit Risk', 'Review / Sign Off High-Risk Facilities', 'Log Early-Warning Risk Cases'],
    'Enterprise Risk Management scope.'
  ),
  FRAUD_INVESTIGATION: makeCaps(
    ['OVERVIEW', 'RISK_AUDIT', 'ACCOUNTING_AUDIT', 'LOANS', 'PAYMENTS', 'MEMBERS', 'GUARANTORS', 'FIELD_OPS', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    { canViewOverviewMetrics: true, canViewCustomerDirectory: true, canManageCases: true, canViewCountsDropdown: true, canExportReports: true },
    ['Investigate Duplicate IDs & Forensic Anomalies', 'Verify Locations on Live GIS Map', 'Resolve Fraud Incident Cases'],
    'Fraud Forensics scope: Forensic inspection & case resolution only.'
  ),
  SECURITY_OPERATIONS: makeCaps(
    ['OVERVIEW', 'RISK_AUDIT', 'ACCOUNTING_AUDIT', 'FIELD_OPS', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    { canViewOverviewMetrics: true, canManageCases: true, canViewCountsDropdown: true, canExportReports: true },
    ['Monitor Security Incidents & Access Trail', 'Cross-Check Staff Account Qualifications', 'Audit Device & Field Location Telemetry'],
    'Security Operations Center scope: Financial disbursements and borrower loan creation are excluded.'
  ),
  MARKETING: makeCaps(
    ['OVERVIEW', 'GROWTH_CAPITAL', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    { canManageCampaigns: true, canExportReports: true },
    ['Launch SMS / WhatsApp Acquisition Campaigns', 'Track Leads, Budget & Conversion Reach', 'Read Team Directives & Join Briefings'],
    'Marketing & Growth scope: Private borrower records, investor pools, and payroll are excluded.'
  ),
  INVESTOR: makeCaps(
    ['OVERVIEW', 'GROWTH_CAPITAL', 'STAFF_COMMS', 'MEETINGS_REPORTS'],
    { canManageInvestors: true, canExportReports: true },
    ['Inspect Committed & Deployed Capital Tranches', 'Add New Capital Tranches & Track APR Yield', 'Download Period Executive Snapshots'],
    'Investor Capital Portal: Borrower private PII, HR payroll, and field recovery details are excluded.'
  ),
};

export function normalizeRoleKey(roleKey) {
  const upper = String(roleKey || 'MEMBER_PORTAL').toUpperCase().replace(/-/g, '_').trim();
  return ROLE_CANONICAL_MAP[upper] || upper;
}

export function resolveRoleCapabilities(roleKey) {
  const canonical = normalizeRoleKey(roleKey);
  return FRONTEND_ROLE_CAPABILITIES[canonical] || FRONTEND_ROLE_CAPABILITIES.MEMBER_PORTAL;
}
