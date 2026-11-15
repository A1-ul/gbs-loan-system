import React, { useState, useMemo } from 'react';
import { BookOpen, X, Search, ShieldCheck, CheckCircle2, Terminal } from 'lucide-react';
import { ROLES_META, resolveRoleMeta } from '../constants/rolesMeta';

const CORE_SYSTEM_WORKFLOWS = [
  {
    title: '1. Institutional Onboarding & 1-Month Free Trial',
    steps: [
      'New financial organizations apply via the GBS Onboarding Form with legal registration details and official GPS digital address.',
      'Once approved by Platform Authority, the organization starts an automatic 1-Month (30-Day) Free Trial.',
      'Before trial expiry, Company Owner selects 3 Months, 6 Months, 9 Months, 12 Months, or Lifetime subscription.',
    ],
  },
  {
    title: '2. Company Name, Logo Branding & Staff Approval Gate',
    steps: [
      'Company Owner or Branch Manager sets the exact organization name and uploads the company logo inside Company Branding.',
      'The company name and logo immediately reflect across all tenant dashboards, receipts, and headers without renaming the core GBS platform.',
      'Branch Managers or Company Owner can create staff accounts across all 29 roles, including mandatory GPS Digital Addresses; every new staff member must be approved by the Company Owner before accessing the portal.',
    ],
  },
  {
    title: '3. Customers, Guarantors, Loans & Monetary Auditing',
    steps: [
      'Every borrower, guarantor, and employee form captures verified mobile contact and GPS digital address.',
      'Loan applications, officer underwriting review, approvals, and fund disbursements record actor name, role, and full monetary snapshot into the immutable Loan Workflow Audit Trail.',
      'All interest, installment schedules, and repayments compute in integer pesewa precision. Accountants run Ledger Reconciliation & submit audited statements for Company Owner sign-off.',
    ],
  },
  {
    title: '4. Live Operations: Attendance, Messaging, CCTV & Emergency Locator',
    steps: [
      'Staff use Daily Clock In / Clock Out with GPS stamps to log attendance shifts and working hours.',
      'Company Owner sends general broadcasts to All Staff or targeted messages to selected staff members, and links branch/vault CCTV cameras via QR/code for mobile viewing.',
      'Emergency GPS Locator searches Customers, Guarantors (including hidden records), and Staff by mobile number or digital GPS address directly onto Google Live Map.',
      'Reports wrap and persist Weekly, Monthly, and Yearly institutional & staff summaries with CSV download.',
    ],
  },
];

const DEVELOPER_GUIDE_SECTIONS = [
  {
    title: 'Tenant Approval & 1-Month Free Trial Activation',
    steps: [
      'Open "Tenant Approvals & Subscriptions" in the Developer Control Center.',
      'Inspect pending KYB applications, registration numbers, GPS coordinates, and Company Owner contact details.',
      'Click Approve to provision the institution and start its 1-Month (30-Day) Free Trial immediately.',
    ],
  },
  {
    title: 'Locking, Unlocking, Extending & Deleting Tenants',
    steps: [
      'Lock any single tenant or select multiple checkboxes for Bulk Lock to suspend overdue or non-compliant institutions immediately.',
      'Use Unlock or Extension presets (+30d / 1m, +90d / 3m, +180d / 6m, +270d / 9m, +365d / 12m, or Lifetime) to activate paid plans.',
      'Use Delete -> Confirm Delete to cascade-purge a test/decommissioned tenant and all its isolated PostgreSQL records.',
    ],
  },
  {
    title: 'System Lock, Diagnostics, Backups & GIS Surveillance',
    steps: [
      'Use Global System Lock / Maintenance mode to pause all tenant API writes cleanly while keeping developer portal active.',
      'Track any user across tenants via Live GIS Map using mobile number or live field collector telemetry.',
      'Run AI Architecture Audit & PgDump Backups before and after production upgrades.',
    ],
  },
];

const ROLE_PLAYBOOKS = {
  COMPANY_OWNER: [
    'Review the Company Branding prompt and set your official institution name and logo.',
    'Approve pending Staff accounts before they can sign in, or provision staff across all 29 institutional roles.',
    'Monitor Total Registered Customers, sign off Accountant Ledger Audits, broadcast Staff Notices, schedule online meetings, and link Branch CCTV cameras to your mobile device.',
  ],
  EXECUTIVE_MANAGEMENT: [
    'Oversee multi-branch portfolio performance, approve high-value credit facilities, and review Accountant Ledger Audits.',
    'Generate Weekly, Monthly, and Yearly wrapped reports and broadcast executive directives to staff.',
  ],
  BOARD_EXECUTIVE: [
    'Review institutional capital adequacy, investor commitments, compliance/audit findings, and board-level financial statements.',
  ],
  REGIONAL_MANAGER: [
    'Supervise regional branch disbursements, monitor field collector live GPS telemetry, and resolve regional escalations.',
  ],
  BRANCH_MANAGER: [
    'Update company/branch branding, supervise staff attendance Clock In/Out logs, and create new staff awaiting Company Owner approval.',
    'Verify loan queues, monitor collector GPS movements, and organize branch online meetings.',
  ],
  OPERATIONS_MANAGER: [
    'Manage daily loan processing throughput, review member deletion requests, oversee Excel/CSV data migrations, and coordinate field dispatches.',
  ],
  LOAN_OFFICER: [
    'Register borrowers with Ghana Card & mandatory GPS Digital Address, attach guarantors with GPS addresses, and originate loans.',
    'Track payment due alerts and follow up with assigned borrowers.',
  ],
  SENIOR_CREDIT_OFFICER: [
    'Perform Tier-2 credit appraisal on pending loan applications, verify collateral items, and recommend or approve facilities.',
  ],
  CREDIT_ANALYST: [
    'Evaluate borrower 5Cs, debt-service coverage, monthly income, and credit scores prior to underwriting sign-off.',
  ],
  LOAN_UNDERWRITER: [
    'Verify collateral valuations, guarantor surety agreements, and risk pricing to issue underwriting approvals.',
  ],
  COLLECTIONS: [
    'Monitor Payment Collection Alerts, log field visits with collected cash/MoMo receipts, and stream live GPS coordinates.',
  ],
  FIELD_OFFICER: [
    'Share Live Device GPS when on route, clock in/out daily, record customer field visits, and verify guarantor/borrower GPS addresses.',
  ],
  MOBILE_STAFF: [
    'Use mobile field check-ins, live GPS sharing, and quick MoMo/Cash repayment posting while on route.',
  ],
  CUSTOMER_SERVICE: [
    'Log and resolve borrower inquiries and support tickets, assist with statement requests, and verify customer profiles.',
  ],
  RECEPTION: [
    'Manage front-desk walk-in inquiries, log visitor and borrower support tickets, and route customers to loan officers.',
  ],
  ACCOUNTANT: [
    'Verify CASH repayment receipts, audit loan schedules and interest accuracy, and run Ledger Reconciliation.',
    'Submit balanced/flagged accounting audits directly to Company Owner for final sign-off.',
  ],
  FINANCE_MANAGER: [
    'Oversee institutional P&L, cash flow projections, monthly staff payroll generation, and investor capital yields.',
  ],
  TREASURY: [
    'Manage vault liquidity, disburse approved loans, reconcile bank/MoMo float balances, and track investor deployments.',
  ],
  HUMAN_RESOURCE: [
    'Provision staff across all 29 roles with mandatory GPS addresses, manage qualification & salary grade profiles, and audit attendance.',
  ],
  LEGAL_DEPARTMENT: [
    'Manage loan contracts, guarantor liability enforcement, collateral documentation, and legal recovery cases.',
  ],
  COMPLIANCE: [
    'Monitor Bank of Ghana regulatory compliance, AML/CFT cases, KYC verification completeness, and role qualification audits.',
  ],
  INTERNAL_AUDIT: [
    'Inspect immutable system audit trails, run independent ledger reconciliations, and audit role registrations.',
  ],
  RISK_MANAGEMENT: [
    'Track Portfolio at Risk (PAR), overdue/defaulted loan exposure, collateral coverage, and risk mitigation cases.',
  ],
  FRAUD_INVESTIGATION: [
    'Investigate flagged identity/KYC anomalies, duplicate credentials, and suspicious transaction alerts.',
  ],
  SECURITY_OPERATIONS: [
    'Monitor branch/vault CCTV streams, access control logs, 2FA/biometric enrollment, and security incident cases.',
  ],
  MARKETING: [
    'Launch and track SMS/digital acquisition campaigns, monitor lead conversion rates, and grow borrower onboarding.',
  ],
  INVESTOR: [
    'Track committed vs deployed capital, annual yield rates, accrued returns, and institutional portfolio health.',
  ],
  MEMBER_PORTAL: [
    'View your active loan balance, installment schedule, Mobile Money payments, and security settings.',
  ],
  GUARANTOR_PORTAL: [
    'Inspect guaranteed loans, sign digital surety agreements, and manage overdue penalty notifications.',
  ],
};

export default function OperatingGuideModal({ isOpen, onClose, userRole = 'MEMBER_PORTAL', isDeveloper = false }) {
  const [roleSearch, setRoleSearch] = useState('');
  const currentRole = resolveRoleMeta(userRole);

  const filteredRoles = useMemo(() => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return ROLES_META;
    return ROLES_META.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.key.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }, [roleSearch]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(4, 8, 16, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          maxWidth: 960,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 24,
          border: '1px solid rgba(212, 175, 55, 0.45)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div>
            <h2 className="gold-gradient-text" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              {isDeveloper ? <Terminal size={22} color="#F87171" /> : <BookOpen size={22} color="#D4AF37" />}
              {isDeveloper ? 'Lead Developer Operating Guide' : `GBS Loan System Operating Guide (All ${ROLES_META.length} User Roles)`}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94A3B8' }}>
              {isDeveloper
                ? 'Isolated platform-authority instructions for multi-tenant provisioning, locks, backups, and diagnostics.'
                : `Active Portal Guide: ${currentRole.title} (${currentRole.category})`}
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={onClose} aria-label="Close guide">
            <X size={16} /> Close
          </button>
        </div>

        {isDeveloper ? (
          <div style={{ display: 'grid', gap: 14 }}>
            {DEVELOPER_GUIDE_SECTIONS.map((sec) => (
              <div key={sec.title} style={{ background: 'rgba(15, 27, 49, 0.78)', padding: 16, borderRadius: 12, border: '1px solid rgba(239,68,68,0.28)' }}>
                <h4 style={{ margin: '0 0 8px', color: '#FCA5A5' }}>{sec.title}</h4>
                <ul style={{ margin: 0, paddingLeft: 18, color: '#E2E8F0', fontSize: '0.84rem', display: 'grid', gap: 6 }}>
                  {sec.steps.map((st, idx) => <li key={idx}>{st}</li>)}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Current Role Highlight */}
            <div style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.45)', padding: 16, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <ShieldCheck size={18} color="#D4AF37" />
                <strong style={{ color: '#F4E07B' }}>Your Role Operating Checklist: {currentRole.title}</strong>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: '0.83rem', color: '#E2E8F0' }}>{currentRole.subtitle}</p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.82rem', color: '#CBD5E1', display: 'grid', gap: 4 }}>
                {(ROLE_PLAYBOOKS[currentRole.key] || [
                  'Clock in at shift start and clock out upon closing.',
                  'Capture complete customer/guarantor details including GPS Digital Addresses.',
                  'Monitor notifications for Company Owner broadcasts, payment alerts, and scheduled online meetings.',
                ]).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Platform Core Workflows */}
            <div className="gbs-grid-2" style={{ gap: 12 }}>
              {CORE_SYSTEM_WORKFLOWS.map((wf) => (
                <div key={wf.title} style={{ background: 'rgba(15, 27, 49, 0.72)', padding: 14, borderRadius: 10, border: '1px solid rgba(212,175,55,0.2)' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#00F2FE', fontSize: '0.9rem' }}>{wf.title}</h4>
                  <ul style={{ margin: 0, paddingLeft: 18, color: '#CBD5E1', fontSize: '0.78rem', display: 'grid', gap: 5 }}>
                    {wf.steps.map((s, idx) => <li key={idx}>{s}</li>)}
                  </ul>
                </div>
              ))}
            </div>

            {/* Searchable All-30 Roles Manual */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                <h4 style={{ margin: 0, color: '#D4AF37' }}>All {ROLES_META.length} Institutional Roles Directory &amp; Duties</h4>
                <div style={{ position: 'relative', minWidth: 240 }}>
                  <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: 11 }} />
                  <input
                    type="text"
                    className="gbs-input"
                    style={{ paddingLeft: 32, paddingTop: 7, paddingBottom: 7, fontSize: '0.8rem' }}
                    placeholder="Filter roles (e.g. Accountant, Loan...)"
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="gbs-grid-3" style={{ gap: 10 }}>
                {filteredRoles.map((r) => (
                  <div
                    key={r.key}
                    style={{
                      background: r.key === currentRole.key ? 'rgba(212,175,55,0.14)' : 'rgba(6,12,24,0.82)',
                      border: `1px solid ${r.key === currentRole.key ? '#D4AF37' : 'rgba(148,163,184,0.2)'}`,
                      borderRadius: 10,
                      padding: 12,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <strong style={{ fontSize: '0.82rem', color: '#FFFFFF' }}>{r.title}</strong>
                      <span className="badge badge-gold" style={{ fontSize: '0.62rem' }}>{r.category}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#CBD5E1', marginBottom: 6 }}>{r.subtitle}</div>
                    {(ROLE_PLAYBOOKS[r.key] || []).map((tip, i) => (
                      <div key={i} style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'flex', gap: 5, marginTop: 3 }}>
                        <CheckCircle2 size={12} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

