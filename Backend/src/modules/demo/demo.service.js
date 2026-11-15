const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { prisma } = require('../../config/database');
const { signAccessToken, signRefreshToken } = require('../../utils/jwt');
const { ValidationError, AuthorizationError } = require('../../utils/errors');

const DEMO_TENANT_CODE = 'DEMO-SANDBOX';
const DEMO_PROV = {
  dataSource: 'DEVELOPMENT_SEED',
  environmentTag: 'DEVELOPMENT',
  isProductionRecord: false,
};

const CANONICAL_DEMO_ROLES = [
  { key: 'COMPANY_OWNER', slug: 'company-owner', title: 'Company Owner', category: 'Executive & Governance', dept: 'EXECUTIVE' },
  { key: 'EXECUTIVE_MANAGEMENT', slug: 'executive-management', title: 'Executive Management', category: 'Executive & Governance', dept: 'EXECUTIVE' },
  { key: 'REGIONAL_MANAGER', slug: 'regional-manager', title: 'Regional Manager', category: 'Executive & Governance', dept: 'OPERATIONS' },
  { key: 'BRANCH_MANAGER', slug: 'branch-manager', title: 'Branch Manager', category: 'Executive & Governance', dept: 'BRANCH_OPS' },
  { key: 'OPERATIONS_MANAGER', slug: 'operations-manager', title: 'Operations Manager', category: 'Executive & Governance', dept: 'OPERATIONS' },
  { key: 'LOAN_OFFICER', slug: 'loan-officer', title: 'Loan Officer', category: 'Credit & Underwriting', dept: 'CREDIT' },
  { key: 'SENIOR_CREDIT_OFFICER', slug: 'senior-credit-officer', title: 'Senior Credit Officer', category: 'Credit & Underwriting', dept: 'CREDIT' },
  { key: 'CREDIT_ANALYST', slug: 'credit-analyst', title: 'Credit Analyst', category: 'Credit & Underwriting', dept: 'CREDIT' },
  { key: 'LOAN_UNDERWRITER', slug: 'loan-underwriter', title: 'Loan Underwriter', category: 'Credit & Underwriting', dept: 'CREDIT' },
  { key: 'COLLECTIONS', slug: 'collections', title: 'Collections', category: 'Field & Collections', dept: 'COLLECTIONS' },
  { key: 'FIELD_OFFICER', slug: 'field-officer', title: 'Field Officer', category: 'Field & Collections', dept: 'FIELD' },
  { key: 'CUSTOMER_SERVICE', slug: 'customer-service', title: 'Customer Service', category: 'Customer Care & Front Desk', dept: 'SUPPORT' },
  { key: 'RECEPTION', slug: 'reception', title: 'Reception', category: 'Customer Care & Front Desk', dept: 'SUPPORT' },
  { key: 'GUARANTOR_PORTAL', slug: 'guarantor-portal', title: 'Guarantor Portal', category: 'Borrower & Guarantor Self-Service', dept: 'SELF_SERVICE' },
  { key: 'MEMBER_PORTAL', slug: 'member-portal', title: 'Member Portal', category: 'Borrower & Guarantor Self-Service', dept: 'SELF_SERVICE' },
  { key: 'ACCOUNTANT', slug: 'accountant', title: 'Accountant', category: 'Finance, Accounting & Treasury', dept: 'FINANCE' },
  { key: 'FINANCE_MANAGER', slug: 'finance-manager', title: 'Finance Manager', category: 'Finance, Accounting & Treasury', dept: 'FINANCE' },
  { key: 'TREASURY', slug: 'treasury', title: 'Treasury', category: 'Finance, Accounting & Treasury', dept: 'TREASURY' },
  { key: 'HUMAN_RESOURCE', slug: 'human-resource', title: 'Human Resource', category: 'People & Administration', dept: 'HR' },
  { key: 'LEGAL_DEPARTMENT', slug: 'legal-department', title: 'Legal Department', category: 'Risk, Legal & Assurance', dept: 'LEGAL' },
  { key: 'COMPLIANCE', slug: 'compliance', title: 'Compliance', category: 'Risk, Legal & Assurance', dept: 'COMPLIANCE' },
  { key: 'INTERNAL_AUDIT', slug: 'internal-audit', title: 'Internal Audit', category: 'Risk, Legal & Assurance', dept: 'AUDIT' },
  { key: 'RISK_MANAGEMENT', slug: 'risk-management', title: 'Risk Management', category: 'Risk, Legal & Assurance', dept: 'RISK' },
  { key: 'FRAUD_INVESTIGATION', slug: 'fraud-investigation', title: 'Fraud Investigation', category: 'Risk, Legal & Assurance', dept: 'FRAUD' },
  { key: 'SECURITY_OPERATIONS', slug: 'security-operations', title: 'Security Operations', category: 'Risk, Legal & Assurance', dept: 'SECOPS' },
  { key: 'MARKETING', slug: 'marketing', title: 'Marketing', category: 'Growth & Capital', dept: 'MARKETING' },
  { key: 'INVESTOR', slug: 'investor', title: 'Investor', category: 'Growth & Capital', dept: 'INVESTMENTS' },
  { key: 'BOARD_EXECUTIVE', slug: 'board-executive', title: 'Board-Only Executive', category: 'Executive & Governance', dept: 'BOARD' },
  { key: 'MOBILE_STAFF', slug: 'mobile-staff', title: 'Mobile Staff (App)', category: 'Field & Collections', dept: 'MOBILE' },
];

const DEMO_WALKTHROUGH_STEPS = [
  {
    id: 'step-branding-plans',
    step: 1,
    title: 'Company Branding, Trial Plans & Mobile CCTV',
    role: 'COMPANY_OWNER',
    tab: 'BRANDING_CCTV',
    summary: 'Customize your exact company name and logo across dashboards, inspect the 1-Month Free Trial and 3/6/9/12 Months or Lifetime plans, and pair mobile CCTV streams.',
  },
  {
    id: 'step-staff-attendance',
    step: 2,
    title: 'Staff Creation, Owner Approval & Daily Clock In/Out',
    role: 'BRANCH_MANAGER',
    tab: 'HR_PAYROLL',
    summary: 'Create staff across all 29 roles with mandatory GPS Digital Address, submit to Company Owner approval queue, log Clock In / Clock Out shifts, and run payroll.',
  },
  {
    id: 'step-customers-gps',
    step: 3,
    title: 'Borrowers, Guarantors & Hidden Search (Phone / GPS Address)',
    role: 'LOAN_OFFICER',
    tab: 'MEMBERS',
    summary: 'Register borrowers & guarantors with GhanaPost GPS Digital Address, search confidential/hidden records by mobile or GPS, and jump directly onto Google Live Map.',
  },
  {
    id: 'step-emergency-locator',
    step: 4,
    title: 'Emergency GPS Locator & Field Collector Telemetry',
    role: 'COLLECTIONS',
    tab: 'FIELD_OPS',
    summary: 'Locate any customer, guarantor, or field employee by mobile contact or digital GPS address with live Google Maps routing & collector check-ins.',
  },
  {
    id: 'step-loans-repayments',
    step: 5,
    title: 'Loan Origination, Pesewa Math & Audited Workflow History',
    role: 'LOAN_UNDERWRITER',
    tab: 'LOANS',
    summary: 'Originate loans, review full actor-stamped workflow history, inspect integer-pesewa installment schedules, and process MoMo/Bank/Cash repayments.',
  },
  {
    id: 'step-accountant-audit',
    step: 6,
    title: 'Accountant Ledger Audit & Company Owner Sign-Off',
    role: 'ACCOUNTANT',
    tab: 'ACCOUNTING_AUDIT',
    summary: 'Verify ledger totals (disbursed, expected interest, repaid, MoMo float, cash in hand) and submit balanced or flagged audits directly to Company Owner.',
  },
  {
    id: 'step-comms-reports',
    step: 7,
    title: 'Staff Broadcast Messaging, Online Meetings & Wrapped Reports',
    role: 'COMPANY_OWNER',
    tab: 'MEETINGS_REPORTS',
    summary: 'Broadcast notices to all or selected staff, schedule Zoom/online meetings, and wrap Weekly, Monthly, and Yearly staff/financial reports with CSV/PDF export.',
  },
  {
    id: 'step-self-service',
    step: 8,
    title: 'Borrower & Guarantor Self-Service Portals',
    role: 'MEMBER_PORTAL',
    tab: 'LOANS',
    summary: 'Switch into Borrower (Member Portal) or Guarantor Portal to view personal schedules, MoMo payments, and liability agreements.',
  },
];

async function ensureDemoSandboxEnvironment() {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86400000);

  const demoTenant = await prisma.tenant.upsert({
    where: { code: DEMO_TENANT_CODE },
    update: {
      status: 'ACTIVE',
      onboardingStatus: 'ACTIVE_TRIAL',
      subExpiry: in30Days,
      daysLeft: 30,
      ...DEMO_PROV,
    },
    create: {
      code: DEMO_TENANT_CODE,
      institutionId: 'GBS-DEMO-SANDBOX',
      name: 'GBS Demo Walkthrough Sandbox (MFI)',
      domain: 'demo-sandbox.gbsloan.com',
      institutionType: 'MICROFINANCE',
      status: 'ACTIVE',
      onboardingStatus: 'ACTIVE_TRIAL',
      planTier: 'Enterprise',
      subscriptionPlan: 'TRIAL_1M',
      subscriptionMonths: 1,
      isLifetime: false,
      contactEmail: 'demo-sandbox@gbsloan.com',
      contactPhone: '+233209900100',
      country: 'Ghana',
      region: 'Greater Accra',
      city: 'Accra',
      location: 'Osu Oxford Street, Accra (Demo Sandbox)',
      latitude: 5.5600,
      longitude: -0.1816,
      representativeName: 'Demo Walkthrough Director',
      representativeEmail: 'demo.company-owner@demo.gbsloan.com',
      representativePhone: '+233591000001',
      representativeRole: 'COMPANY_OWNER',
      companyNameUpdated: true,
      termsAccepted: true,
      subStart: now,
      subExpiry: in30Days,
      daysLeft: 30,
      approvedAt: now,
      ...DEMO_PROV,
    },
  });

  const demoBranch = await prisma.branch.upsert({
    where: { code: `${DEMO_TENANT_CODE}-HQ` },
    update: { tenantId: demoTenant.id, status: 'ACTIVE' },
    create: {
      tenantId: demoTenant.id,
      name: 'GBS Demo Sandbox HQ Branch',
      code: `${DEMO_TENANT_CODE}-HQ`,
      type: 'HEADQUARTERS',
      region: 'Greater Accra',
      city: 'Accra',
      address: 'GA-183-8164 • Osu Oxford Street, Accra',
      latitude: 5.5600,
      longitude: -0.1816,
      geofenceRadius: 500,
      isMain: true,
      status: 'ACTIVE',
    },
  });

  const existingLoc = await prisma.tenantLocation.findFirst({ where: { tenantId: demoTenant.id, isHQ: true } });
  if (!existingLoc) {
    await prisma.tenantLocation.create({
      data: {
        tenantId: demoTenant.id,
        branchId: demoBranch.id,
        name: 'GBS Demo Sandbox HQ',
        branchName: demoBranch.name,
        region: 'Greater Accra',
        city: 'Accra',
        latitude: 5.5600,
        longitude: -0.1816,
        address: 'GA-183-8164 • Osu Oxford Street, Accra',
        geofenceRadius: 500,
        isHQ: true,
        status: 'ACTIVE',
      },
    });
  }

  const demoPasswordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);

  // Ensure demo LoanProduct + sample Borrower + Confidential Hidden Borrower + Guarantor + Collector + Loans + Alert
  const demoProduct = await prisma.loanProduct.upsert({
    where: { code: 'DEMO-PRD-SME' },
    update: { tenantId: demoTenant.id },
    create: {
      tenantId: demoTenant.id,
      code: 'DEMO-PRD-SME',
      name: 'Demo SME Working Capital Facility',
      category: 'SME_LOAN',
      minAmount: 500,
      maxAmount: 200000,
      interestRate: 15.0,
      penaltyRate: 5.0,
      minTermMonths: 1,
      maxTermMonths: 24,
    },
  });

  // Sample Demo Member User
  const demoBorrowerEmail = 'demo.member-portal@demo.gbsloan.com';
  const demoBorrowerUser = await prisma.user.upsert({
    where: { email: demoBorrowerEmail },
    update: {
      tenantId: demoTenant.id,
      branchId: demoBranch.id,
      status: 'ACTIVE',
      qualificationVerified: true,
      ...DEMO_PROV,
    },
    create: {
      tenantId: demoTenant.id,
      branchId: demoBranch.id,
      email: demoBorrowerEmail,
      username: 'demo_member_portal',
      phone: '+233591000016',
      passwordHash: demoPasswordHash,
      role: 'MEMBER_PORTAL',
      status: 'ACTIVE',
      firstName: 'Kofi',
      lastName: 'Boateng (Demo)',
      address: 'Osu Ring Road East, Accra',
      gpsAddress: 'GA-183-8164',
      gpsLatitude: 5.5600,
      gpsLongitude: -0.1816,
      otpVerified: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      qualificationVerified: true,
      ...DEMO_PROV,
    },
  });

  const demoMember = await prisma.member.upsert({
    where: { userId: demoBorrowerUser.id },
    update: { tenantId: demoTenant.id, branchId: demoBranch.id, gpsAddress: 'GA-183-8164', ...DEMO_PROV },
    create: {
      tenantId: demoTenant.id,
      branchId: demoBranch.id,
      userId: demoBorrowerUser.id,
      memberNumber: 'MEM-DEMO-001',
      ghanaCardNumber: 'GHA-882910021-1',
      ghanaCardVerified: true,
      ghanaCardVerifiedAt: now,
      occupation: 'Retail Trader',
      employer: 'Osu Market Enterprise',
      monthlyIncome: 6200,
      gpsAddress: 'GA-183-8164',
      gpsLatitude: 5.5600,
      gpsLongitude: -0.1816,
      isHidden: false,
      creditScore: 760,
      kycStatus: 'VERIFIED',
      ...DEMO_PROV,
    },
  });

  // Hidden sample customer for demonstrating GPS/Mobile hidden search & Emergency Locator
  const hiddenEmail = 'demo.hidden.customer@demo.gbsloan.com';
  const hiddenUser = await prisma.user.upsert({
    where: { email: hiddenEmail },
    update: { tenantId: demoTenant.id, isHidden: true, gpsAddress: 'GA-492-9910', ...DEMO_PROV },
    create: {
      tenantId: demoTenant.id,
      branchId: demoBranch.id,
      email: hiddenEmail,
      username: 'demo_hidden_customer',
      phone: '+233249998877',
      passwordHash: demoPasswordHash,
      role: 'MEMBER_PORTAL',
      status: 'ACTIVE',
      firstName: 'Ama (Confidential)',
      lastName: 'Serwaa',
      address: 'East Legon Shiashie, Accra',
      gpsAddress: 'GA-492-9910',
      gpsLatitude: 5.6352,
      gpsLongitude: -0.1581,
      isHidden: true,
      otpVerified: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      qualificationVerified: true,
      ...DEMO_PROV,
    },
  });

  await prisma.member.upsert({
    where: { userId: hiddenUser.id },
    update: { tenantId: demoTenant.id, isHidden: true, gpsAddress: 'GA-492-9910', ...DEMO_PROV },
    create: {
      tenantId: demoTenant.id,
      branchId: demoBranch.id,
      userId: hiddenUser.id,
      memberNumber: 'MEM-DEMO-HID-02',
      ghanaCardNumber: 'GHA-550192834-7',
      ghanaCardVerified: true,
      occupation: 'Wholesale Distributor',
      monthlyIncome: 9500,
      gpsAddress: 'GA-492-9910',
      gpsLatitude: 5.6352,
      gpsLongitude: -0.1581,
      isHidden: true,
      creditScore: 790,
      kycStatus: 'VERIFIED',
      ...DEMO_PROV,
    },
  });

  // Sample Demo Guarantor
  const demoGuarantorEmail = 'demo.guarantor-portal@demo.gbsloan.com';
  const demoGuarantorUser = await prisma.user.upsert({
    where: { email: demoGuarantorEmail },
    update: { tenantId: demoTenant.id, branchId: demoBranch.id, gpsAddress: 'GA-204-5512', ...DEMO_PROV },
    create: {
      tenantId: demoTenant.id,
      branchId: demoBranch.id,
      email: demoGuarantorEmail,
      username: 'demo_guarantor_portal',
      phone: '+233591000015',
      passwordHash: demoPasswordHash,
      role: 'GUARANTOR_PORTAL',
      status: 'ACTIVE',
      firstName: 'Grace',
      lastName: 'Amoah (Demo)',
      address: 'Airport Residential Area, Accra',
      gpsAddress: 'GA-204-5512',
      gpsLatitude: 5.6050,
      gpsLongitude: -0.1750,
      otpVerified: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      qualificationVerified: true,
      ...DEMO_PROV,
    },
  });

  const demoGuarantor = await prisma.guarantor.upsert({
    where: { userId: demoGuarantorUser.id },
    update: { tenantId: demoTenant.id, gpsAddress: 'GA-204-5512' },
    create: {
      tenantId: demoTenant.id,
      userId: demoGuarantorUser.id,
      ghanaCardNumber: 'GHA-331029481-2',
      relationship: 'Business Partner (Demo)',
      gpsAddress: 'GA-204-5512',
      gpsLatitude: 5.6050,
      gpsLongitude: -0.1750,
      isHidden: false,
      agreementSigned: true,
      agreementSignedAt: now,
      penaltyNotifyEnabled: true,
    },
  });

  // Seed Demo Loans & Schedule only if none exist yet for DEMO-SANDBOX
  const existingLoanCount = await prisma.loan.count({ where: { tenantId: demoTenant.id } });
  if (existingLoanCount === 0) {
    const yesterday = new Date(now.getTime() - 2 * 86400000);
    const loan1 = await prisma.loan.create({
      data: {
        tenantId: demoTenant.id,
        branchId: demoBranch.id,
        loanNumber: 'LN-DEMO-1001',
        memberId: demoMember.id,
        loanProductId: demoProduct.id,
        principalAmount: 15000.0,
        interestRate: 15.0,
        penaltyRate: 5.0,
        termMonths: 6,
        totalAmount: 16125.0,
        amountPaid: 2687.5,
        outstandingAmount: 13437.5,
        status: 'ONGOING',
        purpose: 'Demo Retail Stock Expansion',
        riskScore: 760,
        approvedAt: now,
        disbursedAt: now,
        dueDate: new Date(now.getTime() + 180 * 86400000),
        ...DEMO_PROV,
      },
    });

    await prisma.loanGuarantor.create({
      data: { loanId: loan1.id, guarantorId: demoGuarantor.id },
    }).catch(() => { });

    for (let i = 1; i <= 6; i++) {
      const due = i === 2 ? yesterday : new Date(now.getTime() + (i - 1) * 30 * 86400000);
      await prisma.repaymentSchedule.create({
        data: {
          loanId: loan1.id,
          installmentNo: i,
          dueDate: due,
          principalDue: 2500.0,
          interestDue: 187.5,
          totalDue: 2687.5,
          amountPaid: i === 1 ? 2687.5 : 0,
          isPaid: i === 1,
          paidAt: i === 1 ? now : null,
        },
      });
    }

    await prisma.payment.create({
      data: {
        tenantId: demoTenant.id,
        branchId: demoBranch.id,
        paymentRef: 'PAY-DEMO-1001',
        loanId: loan1.id,
        amount: 2687.5,
        method: 'MOMO',
        status: 'COMPLETED',
        momoPhone: '+233591000016',
        momoTransactionId: 'MTN-DEMO-88401',
        receiptNumber: 'RCP-DEMO-001',
        paidAt: now,
        ...DEMO_PROV,
      },
    });

    await prisma.loanWorkflowLog.create({
      data: {
        loanId: loan1.id,
        fromStatus: 'APPROVED',
        toStatus: 'ONGOING',
        performedBy: demoBorrowerUser.id,
        performedByName: 'Demo Underwriting Committee',
        performedByRole: 'LOAN_UNDERWRITER',
        notes: 'Demo loan approved & disbursed with pesewa schedule audit trail.',
        auditSnapshot: {
          principalAmount: 15000,
          totalAmount: 16125,
          amountPaid: 2687.5,
          outstandingAmount: 13437.5,
        },
      },
    }).catch(() => { });

    await prisma.loan.create({
      data: {
        tenantId: demoTenant.id,
        branchId: demoBranch.id,
        loanNumber: 'LN-DEMO-1002',
        memberId: demoMember.id,
        loanProductId: demoProduct.id,
        principalAmount: 8000.0,
        interestRate: 15.0,
        penaltyRate: 5.0,
        termMonths: 4,
        totalAmount: 8400.0,
        amountPaid: 0,
        outstandingAmount: 8400.0,
        status: 'PENDING',
        purpose: 'Demo Equipment Purchase (Awaiting Review)',
        riskScore: 720,
        ...DEMO_PROV,
      },
    });

    // Seed a pending CASH payment so Accountant/Finance/Owner can test Cash Approval in Demo
    await prisma.payment.create({
      data: {
        tenantId: demoTenant.id,
        branchId: demoBranch.id,
        paymentRef: 'PAY-DEMO-CASH-1002',
        loanId: loan1.id,
        amount: 500.0,
        method: 'CASH',
        status: 'AWAITING_APPROVAL',
        receiptNumber: 'RCP-DEMO-002',
        notes: 'Demo field cash collection awaiting Accountant approval',
        ...DEMO_PROV,
      },
    }).catch(() => { });
  }

  // Ensure an unsigned Demo Guarantor exists so users can test Digital Surety Agreement signing
  const demoUnsignedGuarantorEmail = 'demo.guarantor.pending@demo.gbsloan.com';
  const demoUnsignedGuarantorUser = await prisma.user.upsert({
    where: { email: demoUnsignedGuarantorEmail },
    update: { tenantId: demoTenant.id, branchId: demoBranch.id, gpsAddress: 'GA-301-8840', ...DEMO_PROV },
    create: {
      tenantId: demoTenant.id,
      branchId: demoBranch.id,
      email: demoUnsignedGuarantorEmail,
      username: 'demo_guarantor_pending',
      phone: '+233591000099',
      passwordHash: demoPasswordHash,
      role: 'GUARANTOR_PORTAL',
      status: 'ACTIVE',
      firstName: 'Yaw',
      lastName: 'Osei-Bonsu (Demo Surety)',
      address: 'Tema Community 11',
      gpsAddress: 'GT-301-8840',
      gpsLatitude: 5.6698,
      gpsLongitude: -0.0166,
      otpVerified: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      qualificationVerified: true,
      ...DEMO_PROV,
    },
  });

  await prisma.guarantor.upsert({
    where: { userId: demoUnsignedGuarantorUser.id },
    update: { tenantId: demoTenant.id, gpsAddress: 'GT-301-8840' },
    create: {
      tenantId: demoTenant.id,
      userId: demoUnsignedGuarantorUser.id,
      ghanaCardNumber: 'GHA-441029300-5',
      relationship: 'Trade Association Surety (Demo)',
      gpsAddress: 'GT-301-8840',
      gpsLatitude: 5.6698,
      gpsLongitude: -0.0166,
      isHidden: false,
      agreementSigned: false,
      penaltyNotifyEnabled: true,
    },
  });

  // Ensure Demo Collector exists on map
  const demoCollectorEmail = 'demo.collections@demo.gbsloan.com';
  const demoCollectorUser = await prisma.user.upsert({
    where: { email: demoCollectorEmail },
    update: { tenantId: demoTenant.id, branchId: demoBranch.id, gpsAddress: 'GA-185-2211', ...DEMO_PROV },
    create: {
      tenantId: demoTenant.id,
      branchId: demoBranch.id,
      email: demoCollectorEmail,
      username: 'demo_collections',
      phone: '+233591000011',
      passwordHash: demoPasswordHash,
      role: 'COLLECTIONS',
      status: 'ACTIVE',
      firstName: 'Kwaku',
      lastName: 'Mensah (Demo Collector)',
      address: 'Circle Odawna Zone, Accra',
      gpsAddress: 'GA-185-2211',
      gpsLatitude: 5.5712,
      gpsLongitude: -0.1945,
      otpVerified: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      qualificationVerified: true,
      ...DEMO_PROV,
    },
  });

  await prisma.collector.upsert({
    where: { userId: demoCollectorUser.id },
    update: { tenantId: demoTenant.id, branchId: demoBranch.id, status: 'ON_ROUTE', lastLatitude: 5.5712, lastLongitude: -0.1945, lastLocationAt: now },
    create: {
      tenantId: demoTenant.id,
      branchId: demoBranch.id,
      userId: demoCollectorUser.id,
      employeeId: 'DEMO-COL-001',
      assignedZone: 'Accra Osu & Circle Demo Zone',
      status: 'ON_ROUTE',
      lastLatitude: 5.5712,
      lastLongitude: -0.1945,
      lastSpeed: 24.5,
      lastLocationAt: now,
    },
  });

  // Seed enterprise demo records (Compliance, Support, Investor, Campaign, Meeting, Notice) idempotently
  const [caseCount, ticketCount, investorCount, campaignCount, meetingCount, noticeCount] = await Promise.all([
    prisma.complianceCase.count({ where: { tenantId: demoTenant.id } }),
    prisma.supportTicket.count({ where: { tenantId: demoTenant.id } }),
    prisma.investorAccount.count({ where: { tenantId: demoTenant.id } }),
    prisma.marketingCampaign.count({ where: { tenantId: demoTenant.id } }),
    prisma.zoomMeeting.count({ where: { tenantId: demoTenant.id } }),
    prisma.staffBroadcastMessage.count({ where: { tenantId: demoTenant.id } }),
  ]);

  if (caseCount === 0) {
    await prisma.complianceCase.createMany({
      data: [
        {
          tenantId: demoTenant.id,
          caseCode: 'CMP-DEMO-001',
          category: 'COMPLIANCE',
          severity: 'MEDIUM',
          title: 'Quarterly BoG KYC & Ghana Card Verification Audit',
          description: 'Routine review of borrower Ghana Card & GhanaPost GPS records in Osu branch.',
          status: 'OPEN',
        },
        {
          tenantId: demoTenant.id,
          caseCode: 'FRD-DEMO-002',
          category: 'FRAUD',
          severity: 'HIGH',
          title: 'Duplicate Phone Number Velocity Check',
          description: 'Automated anomaly flag for duplicate mobile contact review during onboarding.',
          status: 'INVESTIGATING',
        },
      ],
    }).catch(() => { });
  }

  if (ticketCount === 0) {
    await prisma.supportTicket.createMany({
      data: [
        {
          tenantId: demoTenant.id,
          ticketNumber: 'TKT-DEMO-001',
          requesterName: 'Kofi Boateng (Demo)',
          requesterPhone: '+233591000016',
          subject: 'MoMo Repayment Receipt Confirmation',
          description: 'Borrower requested SMS confirmation for installment #1.',
          channel: 'MOMO_INQUIRY',
          priority: 'NORMAL',
          status: 'OPEN',
        },
        {
          tenantId: demoTenant.id,
          ticketNumber: 'TKT-DEMO-002',
          requesterName: 'Walk-In SME Prospect',
          requesterPhone: '+233240001122',
          subject: 'Front Desk SME Working Capital Inquiry',
          description: 'Walk-in visitor checked in at Reception for SME loan requirements.',
          channel: 'WALK_IN',
          priority: 'HIGH',
          status: 'IN_PROGRESS',
        },
      ],
    }).catch(() => { });
  }

  if (investorCount === 0) {
    await prisma.investorAccount.create({
      data: {
        tenantId: demoTenant.id,
        investorCode: 'INV-DEMO-001',
        investorName: 'Accra Growth Capital Partners (Demo)',
        email: 'investments@accragrowth.demo',
        committedCapital: 250000,
        deployedCapital: 185000,
        annualYieldRate: 18.5,
        returnsAccrued: 14250,
        status: 'ACTIVE',
      },
    }).catch(() => { });
  }

  if (campaignCount === 0) {
    await prisma.marketingCampaign.create({
      data: {
        tenantId: demoTenant.id,
        campaignCode: 'MKT-DEMO-001',
        name: 'Osu Market Traders SME Drive (Demo)',
        channel: 'SMS',
        budget: 4500,
        leadsCount: 148,
        conversions: 34,
        status: 'ACTIVE',
      },
    }).catch(() => { });
  }

  if (meetingCount === 0) {
    await prisma.zoomMeeting.create({
      data: {
        tenant: { connect: { id: demoTenant.id } },
        zoomMeetingId: `DEMO-MEETING-${Date.now().toString().slice(-6)}`,
        topic: 'Weekly Credit & Collections Standup (Demo)',
        startTime: new Date(now.getTime() + 86400000),
        duration: 45,
        joinUrl: 'https://meet.jit.si/gbs-demo-weekly-credit-standup',
        hostId: demoCollectorUser.id,
        targetScope: 'ALL_STAFF',
        status: 'SCHEDULED',
      },
    }).catch(() => { });
  }

  if (noticeCount === 0) {
    await prisma.staffBroadcastMessage.create({
      data: {
        tenant: { connect: { id: demoTenant.id } },
        senderUserId: demoCollectorUser.id,
        senderName: 'Company Owner (Demo)',
        senderRole: 'COMPANY_OWNER',
        targetScope: 'ALL_STAFF',
        subject: 'Welcome to the GBS Loan Management Interactive Demo',
        body: 'All 29 role portals, pesewa-accurate loan schedules, MoMo/Cash ledgers, GPS tracking, and audit workflows operate live in this isolated sandbox.',
      },
    }).catch(() => { });
  }

  return { demoTenant, demoBranch, demoPasswordHash };
}

function getWalkthroughCatalog() {
  return {
    dataMode: 'DEMO_SANDBOX_ISOLATED',
    sandboxTenantCode: DEMO_TENANT_CODE,
    sandboxTenantName: 'GBS Demo Walkthrough Sandbox (MFI)',
    walkthroughModules: DEMO_WALKTHROUGH_STEPS,
    roles: CANONICAL_DEMO_ROLES,
  };
}

async function issueDemoWalkthroughSession(roleInput = 'COMPANY_OWNER', reqMeta = {}) {
  const rawNormalizedRole = String(roleInput || 'COMPANY_OWNER').toUpperCase().replace(/-/g, '_').trim();
  const normalizedRole = rawNormalizedRole === 'SUPER_ADMIN' ? 'COMPANY_OWNER' : rawNormalizedRole;
  if (['DEVELOPER', 'DEVELOPER_LANDLORD', 'LEAD_DEVELOPER'].includes(normalizedRole)) {
    throw new AuthorizationError('Developer Authority Control Center is never accessible via Demo Walkthrough.');
  }

  const roleIdx = CANONICAL_DEMO_ROLES.findIndex((r) => r.key === normalizedRole);
  if (roleIdx === -1) {
    throw new ValidationError(`Unsupported walkthrough role '${normalizedRole}'.`);
  }
  const roleMeta = CANONICAL_DEMO_ROLES[roleIdx];

  const { demoTenant, demoBranch, demoPasswordHash } = await ensureDemoSandboxEnvironment();

  const demoEmail = `demo.${roleMeta.slug}@demo.gbsloan.com`;
  const demoPhone = `+233591000${String(roleIdx + 1).padStart(3, '0')}`;

  const demoUser = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      tenantId: demoTenant.id,
      branchId: demoBranch.id,
      role: roleMeta.key,
      status: 'ACTIVE',
      qualificationVerified: true,
      otpVerified: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      lastLoginAt: new Date(),
      lastLoginIp: reqMeta.ipAddress || null,
      ...DEMO_PROV,
    },
    create: {
      tenantId: demoTenant.id,
      branchId: demoBranch.id,
      email: demoEmail,
      username: `demo_${roleMeta.slug.replace(/-/g, '_')}`,
      phone: demoPhone,
      passwordHash: demoPasswordHash,
      role: roleMeta.key,
      status: 'ACTIVE',
      firstName: roleMeta.title,
      lastName: '(Demo)',
      address: 'GBS Demo Sandbox Plaza, Accra',
      gpsAddress: `GA-DEMO-${String(roleIdx + 101)}`,
      gpsLatitude: 5.5600 + roleIdx * 0.0005,
      gpsLongitude: -0.1816 - roleIdx * 0.0004,
      otpVerified: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      qualificationVerified: true,
      lastLoginAt: new Date(),
      lastLoginIp: reqMeta.ipAddress || null,
      ...DEMO_PROV,
    },
    include: {
      tenant: {
        select: {
          id: true,
          code: true,
          name: true,
          logoUrl: true,
          companyNameUpdated: true,
          status: true,
          onboardingStatus: true,
          subscriptionPlan: true,
          subscriptionMonths: true,
          isLifetime: true,
          subStart: true,
          subExpiry: true,
          daysLeft: true,
        },
      },
    },
  });

  // Ensure staff profile for staff/management demo accounts so clock in/out & staff listings work cleanly
  if (!['MEMBER_PORTAL', 'GUARANTOR_PORTAL'].includes(roleMeta.key)) {
    const existingStaff = await prisma.staff.findUnique({ where: { userId: demoUser.id } });
    if (!existingStaff) {
      await prisma.staff.create({
        data: {
          tenantId: demoTenant.id,
          branchId: demoBranch.id,
          userId: demoUser.id,
          employeeId: `DEMO-STF-${String(roleIdx + 1).padStart(3, '0')}`,
          department: roleMeta.dept,
          position: roleMeta.title,
          hireDate: new Date(),
          baseSalary: 4500,
          gpsAddress: demoUser.gpsAddress,
          gpsLatitude: demoUser.gpsLatitude,
          gpsLongitude: demoUser.gpsLongitude,
          isActive: true,
        },
      }).catch(() => { });
    }
  }

  const jwtPayload = { userId: demoUser.id, role: demoUser.role, tenantId: demoTenant.id, isDemo: true };
  const accessToken = signAccessToken(jwtPayload);
  const refreshToken = signRefreshToken(jwtPayload);

  return {
    isDemo: true,
    environmentMode: 'DEMO_SANDBOX',
    accessToken,
    refreshToken,
    walkthroughModules: DEMO_WALKTHROUGH_STEPS,
    user: {
      id: demoUser.id,
      tenantId: demoTenant.id,
      tenantCode: demoTenant.code,
      tenantName: demoTenant.name,
      tenantLogoUrl: demoTenant.logoUrl || null,
      branchId: demoUser.branchId,
      email: demoUser.email,
      role: demoUser.role,
      status: demoUser.status,
      firstName: demoUser.firstName,
      lastName: demoUser.lastName,
      phone: demoUser.phone,
      gpsAddress: demoUser.gpsAddress,
      twoFactorEnabled: false,
      facialEnrolled: false,
      qualificationVerified: true,
      voiceEnrolled: false,
      isDemo: true,
      environmentMode: 'DEMO_SANDBOX',
      tenant: demoUser.tenant,
    },
  };
}

module.exports = {
  DEMO_TENANT_CODE,
  CANONICAL_DEMO_ROLES,
  DEMO_WALKTHROUGH_STEPS,
  getWalkthroughCatalog,
  issueDemoWalkthroughSession,
  ensureDemoSandboxEnvironment,
};

