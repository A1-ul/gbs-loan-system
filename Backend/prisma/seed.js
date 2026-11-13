require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { getEnvironmentProfile, getRecordProvenance } = require('../src/config/environments');
const { seedSalaryDefaults } = require('../src/modules/human-resources/services/salaryGrouping.service');

const prisma = new PrismaClient();

async function main() {
  const envProfile = getEnvironmentProfile();
  console.log(`[Seed] Environment: ${envProfile.nodeEnv} (allowSeeders=${envProfile.allowSeeders})`);

  // Ensure baseline SystemLockState exists in all environments
  const lockExists = await prisma.systemLockState.findFirst();
  if (!lockExists) {
    await prisma.systemLockState.create({
      data: {
        isLocked: false,
        maintenanceMode: false,
        lockReason: 'System operational',
        lockedBy: 'SYSTEM_BOOTSTRAP',
      },
    });
  }

  // Always seed HR reference salary grades, steps, qualifications & service bands
  await seedSalaryDefaults();

  if (!envProfile.allowSeeders) {
    console.log('[Seed] Production mode detected — skipping development seeders.');
    return;
  }

  const prov = getRecordProvenance('DEVELOPMENT_SEED');

  // 1. Seed / Update Lead Developer Authority (Separate Landlord Portal)
  const devPasswordHash = await bcrypt.hash(process.env.DEV_BOOTSTRAP_PASSWORD || 'DevMaster@2026!', 12);
  const devAccount = await prisma.developerUser.upsert({
    where: { email: 'developer@gbsloan.com' },
    update: {
      passwordHash: devPasswordHash,
      accessLevel: 'LEAD_DEVELOPER',
      isActive: true,
    },
    create: {
      id: 'usr-dev-2026',
      username: 'lead_developer',
      email: 'developer@gbsloan.com',
      passwordHash: devPasswordHash,
      accessLevel: 'LEAD_DEVELOPER',
      isActive: true,
      allowedIps: ['127.0.0.1', '::1', '::ffff:127.0.0.1'],
    },
  });

  // 2. Backfill / Upsert Tenants (Accra Central, Kumasi Pioneer, Takoradi Harbor, Sunyani, plus Pending Onboarding Cape Coast)
  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 86400000);
  const in25Days = new Date(now.getTime() + 25 * 86400000);
  const past5Days = new Date(now.getTime() - 5 * 86400000);

  const tenantFixtures = [
    {
      code: 'TNT-001',
      institutionId: 'INST-2026-0001',
      name: 'Accra Central Microfinance',
      domain: 'accra-mfi.gbsloan.com',
      institutionType: 'MICROFINANCE',
      status: 'ACTIVE',
      onboardingStatus: 'ACTIVE_TRIAL',
      planTier: 'Enterprise',
      contactEmail: 'admin@accramfi.com',
      contactPhone: '+233201001001',
      country: 'Ghana',
      region: 'Greater Accra',
      city: 'Accra',
      location: 'Osu Oxford Street, Accra',
      latitude: 5.5600,
      longitude: -0.1816,
      registrationNumber: 'CS-GH-2021-8812',
      businessLicenseNumber: 'BOG-MFI-0192',
      tinNumber: 'C0001889201',
      representativeName: 'Kwesi Boateng',
      representativeEmail: 'owner@accramfi.com',
      representativePhone: '+233201001001',
      representativeRole: 'Managing Director',
      subExpiry: in90Days,
      daysLeft: 90,
      approvedAt: now,
      approvedByDeveloperId: devAccount.id,
    },
    {
      code: 'TNT-002',
      institutionId: 'INST-2026-0002',
      name: 'Kumasi Pioneer Sacco',
      domain: 'kumasi-sacco.gbsloan.com',
      institutionType: 'SACCO',
      status: 'ACTIVE',
      onboardingStatus: 'ACTIVE_TRIAL',
      planTier: 'Growth',
      contactEmail: 'info@kumasipioneer.com',
      contactPhone: '+233202002002',
      country: 'Ghana',
      region: 'Ashanti',
      city: 'Kumasi',
      location: 'Adum Harper Road, Kumasi',
      latitude: 6.6885,
      longitude: -1.6244,
      registrationNumber: 'CS-GH-2022-4421',
      businessLicenseNumber: 'BOG-SACCO-0481',
      tinNumber: 'C0002771920',
      representativeName: 'Akosua Frimpong',
      representativeEmail: 'akosua@kumasipioneer.com',
      representativePhone: '+233202002002',
      representativeRole: 'CEO',
      subExpiry: in25Days,
      daysLeft: 25,
      approvedAt: now,
      approvedByDeveloperId: devAccount.id,
    },
    {
      code: 'TNT-003',
      institutionId: 'INST-2026-0003',
      name: 'Takoradi Harbor Credit',
      domain: 'takoradi-credit.gbsloan.com',
      institutionType: 'CREDIT_UNION',
      status: 'LOCKED_EXPIRED',
      onboardingStatus: 'TRIAL_EXPIRED',
      planTier: 'Starter',
      contactEmail: 'support@takoradicredit.com',
      contactPhone: '+233203003003',
      country: 'Ghana',
      region: 'Western',
      city: 'Takoradi',
      location: 'Market Circle, Takoradi',
      latitude: 4.8986,
      longitude: -1.7554,
      registrationNumber: 'CS-GH-2020-3319',
      businessLicenseNumber: 'BOG-CU-0912',
      tinNumber: 'C0003110023',
      representativeName: 'Papa Kofi Yankey',
      representativeEmail: 'yankey@takoradicredit.com',
      representativePhone: '+233203003003',
      representativeRole: 'General Manager',
      subExpiry: past5Days,
      daysLeft: 0,
      approvedAt: past5Days,
      approvedByDeveloperId: devAccount.id,
    },
    {
      code: 'TNT-004',
      institutionId: 'INST-2026-0004',
      name: 'Sunyani Community Credit',
      domain: 'sunyani-credit.gbsloan.com',
      institutionType: 'CREDIT_UNION',
      status: 'LOCKED_EXPIRED',
      onboardingStatus: 'TRIAL_EXPIRED',
      planTier: 'Growth',
      contactEmail: 'ops@sunyanicredit.com',
      contactPhone: '+233204004004',
      country: 'Ghana',
      region: 'Bono',
      city: 'Sunyani',
      location: 'Liberation Road, Sunyani',
      latitude: 7.3349,
      longitude: -2.3123,
      registrationNumber: 'CS-GH-2023-1204',
      businessLicenseNumber: 'BOG-CU-1102',
      tinNumber: 'C0004991823',
      representativeName: 'Yaw Adu-Gyamfi',
      representativeEmail: 'yaw@sunyanicredit.com',
      representativePhone: '+233204004004',
      representativeRole: 'Director',
      subExpiry: past5Days,
      daysLeft: 0,
      approvedAt: past5Days,
      approvedByDeveloperId: devAccount.id,
    },
    {
      code: 'TNT-005',
      institutionId: 'INST-2026-0005',
      name: 'Cape Coast Heritage MicroCredit',
      domain: 'capecoast-mfi.gbsloan.com',
      institutionType: 'MICROFINANCE',
      status: 'PENDING',
      onboardingStatus: 'PENDING',
      planTier: 'Enterprise',
      contactEmail: 'onboarding@capecoastmfi.com',
      contactPhone: '+233205005005',
      country: 'Ghana',
      region: 'Central',
      city: 'Cape Coast',
      location: 'Victoria Park Avenue, Cape Coast',
      latitude: 5.1053,
      longitude: -1.2466,
      registrationNumber: 'CS-GH-2026-9901',
      businessLicenseNumber: 'BOG-MFI-PENDING-91',
      tinNumber: 'C0005820014',
      representativeName: 'Esi Sam',
      representativeEmail: 'esisam@capecoastmfi.com',
      representativePhone: '+233205005005',
      representativeRole: 'Managing Partner',
      subExpiry: in90Days,
      daysLeft: 90,
      approvedAt: null,
      approvedByDeveloperId: null,
    },
  ];

  const seededTenants = {};
  for (const tf of tenantFixtures) {
    const t = await prisma.tenant.upsert({
      where: { code: tf.code },
      update: {
        institutionId: tf.institutionId,
        institutionType: tf.institutionType,
        country: tf.country,
        region: tf.region,
        city: tf.city,
        latitude: tf.latitude,
        longitude: tf.longitude,
        registrationNumber: tf.registrationNumber,
        businessLicenseNumber: tf.businessLicenseNumber,
        tinNumber: tf.tinNumber,
        representativeName: tf.representativeName,
        representativeEmail: tf.representativeEmail,
        representativePhone: tf.representativePhone,
        representativeRole: tf.representativeRole,
        onboardingStatus: tf.onboardingStatus,
        approvedAt: tf.approvedAt,
        approvedByDeveloperId: tf.approvedByDeveloperId,
        ...prov,
      },
      create: {
        ...tf,
        currency: 'GHS',
        timezone: 'Africa/Accra',
        subStart: now,
        alertSent: tf.daysLeft <= 14,
        termsAccepted: true,
        ...prov,
      },
    });
    seededTenants[tf.code] = t;

    await prisma.tenantSubscription.upsert({
      where: { tenantId: t.id },
      update: { status: tf.status === 'PENDING' ? 'PENDING' : tf.daysLeft > 0 ? 'ACTIVE' : 'EXPIRED', endDate: tf.subExpiry },
      create: {
        tenantId: t.id,
        planName: tf.planTier,
        status: tf.status === 'PENDING' ? 'PENDING' : tf.daysLeft > 0 ? 'ACTIVE' : 'EXPIRED',
        startDate: now,
        endDate: tf.subExpiry,
        gracePeriodDays: 7,
      },
    });

    const hqBranch = await prisma.branch.upsert({
      where: { code: `${tf.code}-HQ` },
      update: { latitude: tf.latitude, longitude: tf.longitude, region: tf.region, city: tf.city },
      create: {
        tenantId: t.id,
        name: `${tf.name} HQ`,
        code: `${tf.code}-HQ`,
        type: 'HEADQUARTERS',
        region: tf.region,
        city: tf.city,
        address: tf.location,
        latitude: tf.latitude,
        longitude: tf.longitude,
        geofenceRadius: 500,
        isMain: true,
        status: tf.status === 'PENDING' ? 'PENDING' : 'ACTIVE',
      },
    });

    const existingLoc = await prisma.tenantLocation.findFirst({ where: { tenantId: t.id, isHQ: true } });
    if (!existingLoc) {
      await prisma.tenantLocation.create({
        data: {
          tenantId: t.id,
          branchId: hqBranch.id,
          name: `${tf.name} HQ`,
          branchName: hqBranch.name,
          region: tf.region,
          city: tf.city,
          latitude: tf.latitude,
          longitude: tf.longitude,
          address: tf.location,
          geofenceRadius: 500,
          isHQ: true,
          status: 'ACTIVE',
        },
      });
    }
  }

  const accraTenant = seededTenants['TNT-001'];
  const accraBranch = await prisma.branch.findUnique({ where: { code: 'TNT-001-HQ' } });

  // Bind existing tenant-less users in gbs_loan_db to Accra Central Microfinance (TNT-001)
  await prisma.user.updateMany({
    where: { tenantId: null },
    data: { tenantId: accraTenant.id, branchId: accraBranch?.id || null, ...prov },
  });

  // 3. Upsert core tenant role test accounts across key roles so dashboards can be signed into and audited cleanly
  const defaultPwd = await bcrypt.hash('GbsRole@2026!', 12);
  const roleSeeds = [
    { email: 'admin@gbsloan.com', phone: '+233200000010', role: 'SUPER_ADMIN', firstName: 'System', lastName: 'Administrator', qual: true },
    { email: 'owner@accramfi.com', phone: '+233200000011', role: 'COMPANY_OWNER', firstName: 'Kwesi', lastName: 'Boateng', qual: true },
    { email: 'manager@gbsloan.com', phone: '+233200000001', role: 'OPERATIONS_MANAGER', firstName: 'System', lastName: 'Manager', qual: true },
    { email: 'accountant@gbsloan.com', phone: '+233200000002', role: 'ACCOUNTANT', firstName: 'Finance', lastName: 'Accountant', qual: true },
    { email: 'finance@accramfi.com', phone: '+233200000012', role: 'FINANCE_MANAGER', firstName: 'Efua', lastName: 'Mensah', qual: true },
    { email: 'treasury@accramfi.com', phone: '+233200000013', role: 'TREASURY', firstName: 'Kojo', lastName: 'Antwi', qual: true },
    { email: 'hr@accramfi.com', phone: '+233200000014', role: 'HUMAN_RESOURCE', firstName: 'Nana', lastName: 'Adjei', qual: true },
    { email: 'loanofficer@accramfi.com', phone: '+233200000015', role: 'LOAN_OFFICER', firstName: 'Kofi', lastName: 'Appiah', qual: true },
    { email: 'underwriter@gbsloan.com', phone: '+233200000016', role: 'LOAN_UNDERWRITER', firstName: 'Abena', lastName: 'Sarpong', qual: true },
    { email: 'analyst@accramfi.com', phone: '+233200000017', role: 'CREDIT_ANALYST', firstName: 'Yaw', lastName: 'Ofori', qual: true },
    { email: 'compliance@accramfi.com', phone: '+233200000018', role: 'COMPLIANCE', firstName: 'Mavis', lastName: 'Darko', qual: true },
    { email: 'audit@accramfi.com', phone: '+233200000019', role: 'INTERNAL_AUDIT', firstName: 'Samuel', lastName: 'Owusu', qual: true },
    { email: 'investor@accramfi.com', phone: '+233200000020', role: 'INVESTOR', firstName: 'Daniel', lastName: 'Asante', qual: true },
    { email: 'guarantor@accramfi.com', phone: '+233200000021', role: 'GUARANTOR_PORTAL', firstName: 'Grace', lastName: 'Amoah', qual: true },
    { email: 'staff@gbsloan.com', phone: '+233200000003', role: 'FIELD_OFFICER', firstName: 'Field', lastName: 'Staff', qual: true },
    { email: 'collector@gbsloan.com', phone: '+233200000004', role: 'COLLECTIONS', firstName: 'Payment', lastName: 'Collector', qual: true },
    { email: 'pending.officer@accramfi.com', phone: '+233200000029', role: 'CREDIT_ANALYST', firstName: 'Pending', lastName: 'Applicant', qual: false, status: 'PENDING_VERIFICATION' },
  ];

  const seededUsers = {};
  for (const rs of roleSeeds) {
    const existing = await prisma.user.findUnique({ where: { email: rs.email } });
    if (existing) {
      seededUsers[rs.email] = await prisma.user.update({
        where: { id: existing.id },
        data: {
          tenantId: accraTenant.id,
          branchId: accraBranch?.id || null,
          passwordHash: defaultPwd,
          role: rs.role,
          status: rs.status || 'ACTIVE',
          qualificationVerified: rs.qual,
          isEmailVerified: true,
          isPhoneVerified: true,
          otpVerified: true,
          ...prov,
        },
      });
    } else {
      seededUsers[rs.email] = await prisma.user.create({
        data: {
          tenantId: accraTenant.id,
          branchId: accraBranch?.id || null,
          email: rs.email,
          username: rs.email.split('@')[0],
          phone: rs.phone,
          passwordHash: defaultPwd,
          role: rs.role,
          status: rs.status || 'ACTIVE',
          firstName: rs.firstName,
          lastName: rs.lastName,
          otpVerified: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          qualificationVerified: rs.qual,
          ...prov,
        },
      });
    }
  }

  // Ensure collector has live coordinates inside Accra for GIS visualization
  const colUser = seededUsers['collector@gbsloan.com'];
  const collectorRec = await prisma.collector.upsert({
    where: { userId: colUser.id },
    update: { tenantId: accraTenant.id, branchId: accraBranch?.id, status: 'ON_ROUTE', lastLatitude: 5.5712, lastLongitude: -0.1945, lastSpeed: 28.4, lastLocationAt: now },
    create: {
      tenantId: accraTenant.id,
      branchId: accraBranch?.id,
      userId: colUser.id,
      employeeId: 'COL-001',
      assignedZone: 'Accra Central & Osu',
      status: 'ON_ROUTE',
      lastLatitude: 5.5712,
      lastLongitude: -0.1945,
      lastSpeed: 28.4,
      lastLocationAt: now,
    },
  });

  // 4. Bind existing members & create LoanProducts, Loans, RepaymentSchedules, Payments, Guarantors, Compliance, Investors, Campaigns, Tickets
  await prisma.member.updateMany({ where: { tenantId: null }, data: { tenantId: accraTenant.id, branchId: accraBranch?.id, ...prov } });
  const firstMember = await prisma.member.findFirst({ where: { tenantId: accraTenant.id }, include: { user: true } });

  const guarantorUser = seededUsers['guarantor@accramfi.com'];
  const guarantorRec = await prisma.guarantor.upsert({
    where: { userId: guarantorUser.id },
    update: { tenantId: accraTenant.id },
    create: {
      tenantId: accraTenant.id,
      userId: guarantorUser.id,
      ghanaCardNumber: 'GHA-728491023-4',
      relationship: 'Business Partner',
      agreementSigned: true,
      agreementSignedAt: now,
      penaltyNotifyEnabled: true,
    },
  });

  await prisma.loanProduct.upsert({
    where: { code: 'PRD-SME-01' },
    update: {},
    create: {
      tenantId: accraTenant.id,
      code: 'PRD-SME-01',
      name: 'SME Working Capital Facility',
      category: 'SME_LOAN',
      minAmount: 2000,
      maxAmount: 150000,
      interestRate: 16.0,
      penaltyRate: 4.5,
      minTermMonths: 3,
      maxTermMonths: 24,
    },
  });

  if (firstMember && (await prisma.loan.count()) === 0) {
    const loan1 = await prisma.loan.create({
      data: {
        tenantId: accraTenant.id,
        branchId: accraBranch?.id,
        loanNumber: 'LN-2026-0001',
        memberId: firstMember.id,
        principalAmount: 25000.0,
        interestRate: 15.0,
        penaltyRate: 5.0,
        termMonths: 12,
        totalAmount: 28750.0,
        amountPaid: 4791.66,
        outstandingAmount: 23958.34,
        status: 'ONGOING',
        purpose: 'Retail Inventory Expansion',
        riskScore: 760,
        approvedAt: now,
        approvedById: seededUsers['manager@gbsloan.com'].id,
        disbursedAt: now,
        disbursedById: seededUsers['accountant@gbsloan.com'].id,
        dueDate: new Date(now.getTime() + 365 * 86400000),
        ...prov,
      },
    });

    await prisma.loanGuarantor.create({
      data: { loanId: loan1.id, guarantorId: guarantorRec.id },
    });

    for (let i = 1; i <= 12; i++) {
      const due = new Date(now);
      due.setMonth(due.getMonth() + i);
      await prisma.repaymentSchedule.create({
        data: {
          loanId: loan1.id,
          installmentNo: i,
          dueDate: due,
          principalDue: 2083.33,
          interestDue: 312.50,
          totalDue: 2395.83,
          amountPaid: i <= 2 ? 2395.83 : 0,
          isPaid: i <= 2,
          paidAt: i <= 2 ? now : null,
        },
      });
    }

    await prisma.payment.create({
      data: {
        tenantId: accraTenant.id,
        branchId: accraBranch?.id,
        paymentRef: 'PAY-2026-0001',
        loanId: loan1.id,
        amount: 4791.66,
        method: 'MOMO',
        status: 'COMPLETED',
        momoPhone: '+233240000001',
        momoTransactionId: 'MTN-994012881',
        collectedById: colUser.id,
        approvedById: seededUsers['accountant@gbsloan.com'].id,
        approvedAt: now,
        paidAt: now,
        ...prov,
      },
    });

    await prisma.loan.create({
      data: {
        tenantId: accraTenant.id,
        branchId: accraBranch?.id,
        loanNumber: 'LN-2026-0002',
        memberId: firstMember.id,
        principalAmount: 12000.0,
        interestRate: 15.0,
        penaltyRate: 5.0,
        termMonths: 6,
        totalAmount: 12900.0,
        amountPaid: 0,
        outstandingAmount: 12900.0,
        status: 'PENDING',
        purpose: 'Equipment Lease Financing',
        riskScore: 710,
        ...prov,
      },
    });
  }

  // Seed Staff Salary Profiles for existing staff
  const staffList = await prisma.staff.findMany({ where: { salaryProfile: null } });
  const bachelor = await prisma.qualificationLevel.findUnique({ where: { code: 'BACHELOR' } });
  const grade2 = await prisma.salaryGrade.findUnique({ where: { gradeCode: 'GRADE-2' }, include: { steps: true } });
  const bandB = await prisma.serviceBand.findUnique({ where: { bandName: 'Band B' } });

  for (const st of staffList) {
    await prisma.staff.update({ where: { id: st.id }, data: { tenantId: accraTenant.id, branchId: accraBranch?.id } });
    if (bachelor && grade2 && grade2.steps[0] && bandB) {
      await prisma.employeeSalaryProfile.create({
        data: {
          staffId: st.id,
          qualificationLevelId: bachelor.id,
          salaryGradeId: grade2.id,
          salaryStepId: grade2.steps[0].id,
          serviceBandId: bandB.id,
          yearsOfService: 3,
          branchAllowance: 250,
          responsibilityAllowance: 300,
          housingTransportAllowance: 450,
          performanceBonus: 200,
          totalComputedSalary: Number(grade2.steps[0].amount) + Number(bachelor.baseAllowance) + Number(bandB.allowance) + 1200,
        },
      });
    }
  }

  // Seed Departmental Entities (Visits, Compliance, Tickets, Investor, Campaign, Zoom, Security Alerts)
  if ((await prisma.customerVisit.count()) === 0) {
    await prisma.customerVisit.create({
      data: {
        tenantId: accraTenant.id,
        collectorId: collectorRec.id,
        customerName: firstMember ? `${firstMember.user.firstName} ${firstMember.user.lastName}` : 'Akua Agyemang',
        loanNumber: 'LN-2026-0001',
        visitOutcome: 'COLLECTED',
        amountCollected: 2395.83,
        latitude: 5.565,
        longitude: -0.188,
        notes: 'On-time MoMo collection verified at Osu shop.',
      },
    });
  }

  if ((await prisma.complianceCase.count()) === 0) {
    await prisma.complianceCase.createMany({
      data: [
        {
          tenantId: accraTenant.id,
          caseCode: 'CMP-2026-001',
          category: 'COMPLIANCE',
          severity: 'MEDIUM',
          title: 'BoG Tier-2 Capital Adequacy Quarterly Filing',
          description: 'Verify quarterly reserve ratio documentation prior to BoG submission.',
          status: 'OPEN',
        },
        {
          tenantId: accraTenant.id,
          caseCode: 'FRD-2026-002',
          category: 'FRAUD',
          severity: 'HIGH',
          title: 'Duplicate Ghana Card Prefix Velocity Alert',
          description: 'Automated check flagged secondary verification on ID prefix GHA-7284.',
          status: 'INVESTIGATING',
        },
      ],
    });
  }

  if ((await prisma.supportTicket.count()) === 0) {
    await prisma.supportTicket.create({
      data: {
        tenantId: accraTenant.id,
        ticketNumber: 'TKT-2026-101',
        requesterName: 'Abena Osei',
        requesterPhone: '+233245551100',
        channel: 'PORTAL',
        subject: 'Early Loan Settlement Quote Request',
        description: 'Member requested prorated interest calculation for Month 6 full payoff.',
        priority: 'NORMAL',
        status: 'OPEN',
      },
    });
  }

  if ((await prisma.investorAccount.count()) === 0) {
    await prisma.investorAccount.create({
      data: {
        tenantId: accraTenant.id,
        investorCode: 'INV-2026-001',
        investorName: 'Gold Coast Growth Partners',
        email: 'investor@accramfi.com',
        committedCapital: 1200000.0,
        deployedCapital: 840000.0,
        annualYieldRate: 19.25,
        returnsAccrued: 94500.0,
        status: 'ACTIVE',
      },
    });
  }

  if ((await prisma.marketingCampaign.count()) === 0) {
    await prisma.marketingCampaign.create({
      data: {
        tenantId: accraTenant.id,
        campaignCode: 'MKT-2026-Q4',
        name: 'Accra SME Expansion Drive',
        channel: 'SMS_OUTREACH',
        targetSegment: 'Registered Retail Traders',
        leadsCount: 342,
        conversions: 68,
        budget: 18500.0,
        status: 'ACTIVE',
      },
    });
  }

  if ((await prisma.zoomMeeting.count()) === 0) {
    await prisma.zoomMeeting.create({
      data: {
        tenantId: accraTenant.id,
        zoomMeetingId: '89210443812',
        topic: 'Weekly Credit Committee & Risk Review',
        hostId: seededUsers['manager@gbsloan.com'].id,
        startTime: new Date(now.getTime() + 86400000),
        duration: 60,
        joinUrl: 'https://zoom.us/j/89210443812',
        status: 'SCHEDULED',
      },
    });
  }

  if ((await prisma.deploymentHistory.count()) === 0) {
    await prisma.deploymentHistory.create({
      data: {
        version: '2.0.0-enterprise',
        environment: envProfile.nodeEnv,
        provider: 'render',
        status: 'ACTIVE',
        deployedBy: devAccount.email,
        notes: 'Initial unified enterprise schema & platform baseline',
      },
    });
  }

  console.log('[Seed] GBS Enterprise Loan System seeded cleanly.');
}

main()
  .catch((e) => {
    console.error('[Seed] Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
