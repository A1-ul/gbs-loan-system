const { prisma } = require('../../../config/database');
const { getRecordProvenance } = require('../../../config/environments');
const { getRoleCapabilities, normalizeCapabilityRole } = require('../../../constants/roleCapabilities');

function buildTenantFilter(tenantId) {
  return tenantId ? { tenantId } : {};
}

async function getOverview(tenantId = null) {
  const where = buildTenantFilter(tenantId);
  const [
    loanGroups,
    totalMembers,
    totalStaff,
    collectorGroups,
    totalGuarantors,
    loanAgg,
    paymentAgg,
    branchesCount,
    openTickets,
    openCases,
  ] = await Promise.all([
    prisma.loan.groupBy({ by: ['status'], where, _count: { id: true } }),
    prisma.member.count({ where }),
    prisma.staff.count({ where: { ...where, isActive: true } }),
    prisma.collector.groupBy({ by: ['status'], where, _count: { id: true } }),
    prisma.guarantor.count({ where }),
    prisma.loan.aggregate({
      where,
      _sum: { principalAmount: true, totalAmount: true, amountPaid: true, outstandingAmount: true },
    }),
    prisma.payment.aggregate({
      where: { ...where, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.branch.count({ where }),
    prisma.supportTicket.count({ where: { ...where, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.complianceCase.count({ where: { ...where, status: { in: ['OPEN', 'INVESTIGATING'] } } }),
  ]);

  const loanCountByStatus = new Map(loanGroups.map((g) => [g.status, g._count.id]));
  const countLoanStatuses = (statuses) => statuses.reduce((sum, st) => sum + (loanCountByStatus.get(st) || 0), 0);
  const totalLoans = loanGroups.reduce((sum, g) => sum + g._count.id, 0);
  const pendingLoans = countLoanStatuses(['PENDING']);
  const underReviewLoans = countLoanStatuses(['UNDER_REVIEW']);
  const approvedLoans = countLoanStatuses(['APPROVED']);
  const ongoingLoans = countLoanStatuses(['DISBURSED', 'ONGOING']);
  const overdueLoans = countLoanStatuses(['OVERDUE', 'DEFAULTED']);
  const paidLoans = countLoanStatuses(['PAID', 'CLOSED']);

  const totalCollectors = collectorGroups.reduce((sum, g) => sum + g._count.id, 0);
  const onlineCollectors = collectorGroups
    .filter((g) => ['ONLINE', 'ON_ROUTE', 'AT_LOCATION'].includes(g.status))
    .reduce((sum, g) => sum + g._count.id, 0);

  const totalPrincipal = Number(loanAgg._sum.principalAmount || 0);
  const totalReceivable = Number(loanAgg._sum.totalAmount || 0);
  const totalCollected = Number(paymentAgg._sum.amount || 0);
  const totalOutstanding = Number(loanAgg._sum.outstandingAmount || 0);
  const collectionRate = totalReceivable > 0 ? Number(((totalCollected / totalReceivable) * 100).toFixed(2)) : 0;

  return {
    totalLoans,
    pendingLoans,
    underReviewLoans,
    approvedLoans,
    ongoingLoans,
    overdueLoans,
    paidLoans,
    totalMembers,
    totalStaff,
    totalCollectors,
    onlineCollectors,
    totalGuarantors,
    branchesCount,
    openTickets,
    openComplianceCases: openCases,
    financials: {
      currency: 'GHS',
      totalPrincipal,
      totalReceivable,
      totalCollected,
      totalOutstanding,
      collectionRatePercent: collectionRate,
      completedPaymentsCount: paymentAgg._count || 0,
    },
    generatedAt: new Date().toISOString(),
  };
}

async function getMetrics(tenantId = null, userId = null, role = null) {
  const overview = await getOverview(tenantId);
  const [roleCountsRaw, pendingDeletionCount, investorAgg, campaignAgg, recentHealth] = await Promise.all([
    prisma.user.groupBy({
      by: ['role'],
      where: { ...(tenantId ? { tenantId } : {}), deletedAt: null },
      _count: { id: true },
    }),
    prisma.deletionApprovalRequest.count({
      where: { ...(tenantId ? { tenantId } : {}), status: 'PENDING_MANAGER_APPROVAL' },
    }),
    prisma.investorAccount.aggregate({
      where: tenantId ? { tenantId } : {},
      _sum: { committedCapital: true, deployedCapital: true, returnsAccrued: true },
    }),
    prisma.marketingCampaign.aggregate({
      where: tenantId ? { tenantId } : {},
      _sum: { leadsCount: true, conversions: true, budget: true },
    }),
    prisma.systemHealthLog.findFirst({ orderBy: { recordedAt: 'desc' } }),
  ]);

  return {
    ...overview,
    role,
    userId,
    pendingDeletionApprovals: pendingDeletionCount,
    investorPortfolio: {
      committedCapital: Number(investorAgg._sum.committedCapital || 0),
      deployedCapital: Number(investorAgg._sum.deployedCapital || 0),
      returnsAccrued: Number(investorAgg._sum.returnsAccrued || 0),
    },
    marketingMetrics: {
      totalLeads: Number(campaignAgg._sum.leadsCount || 0),
      totalConversions: Number(campaignAgg._sum.conversions || 0),
      totalBudget: Number(campaignAgg._sum.budget || 0),
    },
    roleBreakdown: roleCountsRaw.map((r) => ({ role: r.role, count: r._count.id })),
    systemHealth: recentHealth
      ? {
        serverStatus: recentHealth.serverStatus,
        databaseStatus: recentHealth.databaseStatus,
        redisStatus: recentHealth.redisStatus,
      }
      : { serverStatus: 'HEALTHY', databaseStatus: 'CONNECTED', redisStatus: 'CONNECTED' },
  };
}

async function getLoanStatusChart(tenantId = null) {
  const grouped = await prisma.loan.groupBy({
    by: ['status'],
    where: buildTenantFilter(tenantId),
    _count: { id: true },
    _sum: { principalAmount: true, outstandingAmount: true },
  });

  return grouped.map((g) => ({
    status: g.status,
    count: g._count.id,
    principal: Number(g._sum.principalAmount || 0),
    outstanding: Number(g._sum.outstandingAmount || 0),
  }));
}

async function getPaymentTrendsChart(tenantId = null) {
  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  since.setDate(1);

  const payments = await prisma.payment.findMany({
    where: {
      ...buildTenantFilter(tenantId),
      status: 'COMPLETED',
      createdAt: { gte: since },
    },
    select: { amount: true, method: true, paidAt: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const buckets = {};
  for (const p of payments) {
    const dt = p.paidAt || p.createdAt;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    if (!buckets[key]) {
      buckets[key] = { month: key, total: 0, MOMO: 0, CASH: 0, BANK_TRANSFER: 0, count: 0 };
    }
    const amt = Number(p.amount || 0);
    buckets[key].total += amt;
    buckets[key][p.method] = (buckets[key][p.method] || 0) + amt;
    buckets[key].count += 1;
  }

  return Object.values(buckets);
}

async function getRecentActivity(tenantId = null, limit = 20, actor = null) {
  const caps = actor?.role ? getRoleCapabilities(actor.role) : null;
  const canonicalRole = actor?.role ? normalizeCapabilityRole(actor.role) : null;
  const whereClause = {
    ...buildTenantFilter(tenantId),
  };

  if (canonicalRole === 'MEMBER_PORTAL' || canonicalRole === 'GUARANTOR_PORTAL') {
    if (actor?.id) {
      whereClause.userId = actor.id;
    }
    if (caps?.activityEntityTypes?.length) {
      whereClause.entityType = { in: caps.activityEntityTypes };
    }
  } else if (caps && !['COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT'].includes(canonicalRole)) {
    if (caps.activityEntityTypes?.length) {
      whereClause.entityType = { in: caps.activityEntityTypes };
    }
  }

  const logs = await prisma.auditLog.findMany({
    where: whereClause,
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, role: true, email: true } },
    },
  });

  return logs.map((l) => ({
    id: l.id,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    actor: l.user ? `${l.user.firstName} ${l.user.lastName} (${l.user.role})` : 'System',
    metadata: l.metadata,
    createdAt: l.createdAt,
  }));
}

/**
 * Role-Tailored Live Dashboard Payload (Real PostgreSQL Queries - Zero Unauthorized Leaks)
 */
async function getRoleDashboardMetrics(role, userId, tenantId = null) {
  const canonicalRole = normalizeCapabilityRole(role || 'MEMBER_PORTAL');
  const caps = getRoleCapabilities(canonicalRole);
  const allowedTabs = new Set(caps.allowedTabs || []);
  const actions = caps.actions || {};
  const where = buildTenantFilter(tenantId);

  const tenantRecord = tenantId
    ? await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, code: true, name: true, status: true, onboardingStatus: true, daysLeft: true, subExpiry: true, planTier: true },
    })
    : null;

  const isDemoSandbox = tenantRecord?.code === 'DEMO-SANDBOX';
  const baseProv = getRecordProvenance();
  const environmentProvenance = isDemoSandbox
    ? { dataSource: 'DEMO_SANDBOX', environmentTag: 'DEMO', isProductionRecord: false }
    : baseProv;

  const roleDescriptor = {
    role: caps.role,
    title: caps.title,
    category: caps.category,
    domain: caps.domain,
    allowedTabs: caps.allowedTabs,
    actions,
    restrictedNotice: caps.restrictedNotice,
  };

  // Strict Self-Service Partition 1: MEMBER_PORTAL
  if (canonicalRole === 'MEMBER_PORTAL') {
    const memberProfile = userId
      ? await prisma.member.findUnique({
        where: { userId },
        include: {
          loans: {
            orderBy: { createdAt: 'desc' },
            include: { payments: { orderBy: { createdAt: 'desc' } }, schedule: true },
          },
        },
      })
      : null;

    const myLoans = memberProfile?.loans || [];
    const myPayments = myLoans.flatMap((l) => l.payments || []);
    const recentActivities = await getRecentActivity(tenantId, 12, { id: userId, role: canonicalRole });

    return {
      role: canonicalRole,
      userId,
      tenantId,
      tenant: tenantRecord,
      environmentProvenance,
      capabilities: roleDescriptor,
      timestamp: new Date().toISOString(),
      summary: {
        myLoansCount: myLoans.length,
        activeLoansCount: myLoans.filter((l) => ['APPROVED', 'DISBURSED', 'ONGOING', 'OVERDUE'].includes(l.status)).length,
        totalBorrowedGhs: myLoans.reduce((s, l) => s + Number(l.principalAmount || 0), 0),
        totalRepaidGhs: myLoans.reduce((s, l) => s + Number(l.amountPaid || 0), 0),
        totalOutstandingGhs: myLoans.reduce((s, l) => s + Number(l.outstandingAmount || 0), 0),
        completedPaymentsCount: myPayments.length,
      },
      datasets: {
        memberProfile,
        recentLoans: myLoans.slice(0, 10),
        recentPayments: myPayments.slice(0, 10),
        recentActivities,
      },
    };
  }

  // Strict Self-Service Partition 2: GUARANTOR_PORTAL
  if (canonicalRole === 'GUARANTOR_PORTAL') {
    const guarantorProfile = userId
      ? await prisma.guarantor.findUnique({
        where: { userId },
        include: {
          loanGuarantors: {
            include: {
              loan: {
                include: {
                  member: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
                  payments: { orderBy: { createdAt: 'desc' }, take: 5 },
                  penalties: true,
                },
              },
            },
          },
        },
      })
      : null;

    const linkedLoans = (guarantorProfile?.loanGuarantors || []).map((lg) => lg.loan).filter(Boolean);
    const guarantorPayments = linkedLoans.flatMap((l) => l.payments || []);
    const recentActivities = await getRecentActivity(tenantId, 12, { id: userId, role: canonicalRole });

    return {
      role: canonicalRole,
      userId,
      tenantId,
      tenant: tenantRecord,
      environmentProvenance,
      capabilities: roleDescriptor,
      timestamp: new Date().toISOString(),
      summary: {
        guaranteedLoansCount: linkedLoans.length,
        totalGuaranteedPrincipalGhs: linkedLoans.reduce((s, l) => s + Number(l.principalAmount || 0), 0),
        totalGuaranteedOutstandingGhs: linkedLoans.reduce((s, l) => s + Number(l.outstandingAmount || 0), 0),
        agreementSigned: Boolean(guarantorProfile?.agreementSigned),
        penaltyAlertsEnabled: Boolean(guarantorProfile?.penaltyNotifyEnabled),
      },
      datasets: {
        guarantorProfile,
        recentLoans: linkedLoans.slice(0, 10),
        recentPayments: guarantorPayments.slice(0, 10),
        recentActivities,
      },
    };
  }

  // Scoped Staff Roles — Only fetch domain data permitted for this role
  const isOwnerOrExec = ['COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT'].includes(canonicalRole);
  const canLoadLoans = allowedTabs.has('LOANS');
  const canLoadPayments = allowedTabs.has('PAYMENTS');
  const canLoadInvestors = canonicalRole === 'INVESTOR' || actions.canManageInvestors || isOwnerOrExec;
  const canLoadCases = allowedTabs.has('RISK_AUDIT');
  const canLoadTickets = allowedTabs.has('SUPPORT');
  const canLoadCampaigns = canonicalRole === 'MARKETING' || actions.canManageCampaigns || isOwnerOrExec;
  const canLoadMeetings = allowedTabs.has('MEETINGS_REPORTS');
  const canLoadCollectors = allowedTabs.has('FIELD_OPS');
  const canLoadStaff = allowedTabs.has('HR_PAYROLL');
  const canLoadSalaries = Boolean(actions.canViewSalaries);

  const [
    overview,
    recentLoans,
    recentPayments,
    investorAccounts,
    complianceCases,
    tickets,
    campaigns,
    meetings,
    collectorList,
    staffList,
    salaryRuns,
    recentActivities,
  ] = await Promise.all([
    actions.canViewOverviewMetrics ? getOverview(tenantId) : Promise.resolve(null),
    canLoadLoans
      ? prisma.loan.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { member: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } },
      })
      : Promise.resolve([]),
    canLoadPayments
      ? prisma.payment.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { loan: { select: { loanNumber: true } } },
      })
      : Promise.resolve([]),
    canLoadInvestors ? prisma.investorAccount.findMany({ where, take: 10, orderBy: { createdAt: 'desc' } }) : Promise.resolve([]),
    canLoadCases ? prisma.complianceCase.findMany({ where, take: 10, orderBy: { createdAt: 'desc' } }) : Promise.resolve([]),
    canLoadTickets ? prisma.supportTicket.findMany({ where, take: 10, orderBy: { createdAt: 'desc' } }) : Promise.resolve([]),
    canLoadCampaigns ? prisma.marketingCampaign.findMany({ where, take: 10, orderBy: { createdAt: 'desc' } }) : Promise.resolve([]),
    canLoadMeetings ? prisma.zoomMeeting.findMany({ where, take: 10, orderBy: { startTime: 'desc' } }) : Promise.resolve([]),
    canLoadCollectors ? prisma.collector.findMany({ where, take: 10, include: { user: { select: { firstName: true, lastName: true, phone: true } }, visits: { take: 5, orderBy: { visitedAt: 'desc' } } } }) : Promise.resolve([]),
    canLoadStaff ? prisma.staff.findMany({ where, take: 10, include: { user: { select: { firstName: true, lastName: true, role: true, status: true } }, salaryProfile: true } }) : Promise.resolve([]),
    canLoadSalaries ? prisma.staffSalary.findMany({ where, take: 10, orderBy: { createdAt: 'desc' }, include: { staff: { include: { user: { select: { firstName: true, lastName: true } } } } } }) : Promise.resolve([]),
    getRecentActivity(tenantId, 15, { id: userId, role: canonicalRole }),
  ]);

  let roleSummary = overview;
  if (!roleSummary) {
    if (canonicalRole === 'HUMAN_RESOURCE') {
      const [activeStaffCount, pendingStaffCount, todayShifts] = await Promise.all([
        prisma.staff.count({ where: { ...where, isActive: true } }),
        prisma.user.count({ where: { ...where, status: 'PENDING_VERIFICATION', deletedAt: null } }),
        prisma.staffAttendance.count({ where: { ...where } }),
      ]);
      roleSummary = {
        activeStaffCount,
        pendingStaffApprovals: pendingStaffCount,
        attendanceLogsCount: todayShifts,
        salaryRunsCount: salaryRuns.length,
      };
    } else if (canonicalRole === 'MARKETING') {
      roleSummary = {
        activeCampaignsCount: campaigns.length,
        totalCampaignBudgetGhs: campaigns.reduce((s, c) => s + Number(c.budget || 0), 0),
        totalReachLeads: campaigns.reduce((s, c) => s + Number(c.leadsCount || 0), 0),
        totalConversions: campaigns.reduce((s, c) => s + Number(c.conversions || 0), 0),
      };
    } else if (canonicalRole === 'INVESTOR') {
      roleSummary = {
        investorTranchesCount: investorAccounts.length,
        totalCommittedCapitalGhs: investorAccounts.reduce((s, i) => s + Number(i.committedCapital || 0), 0),
        totalDeployedCapitalGhs: investorAccounts.reduce((s, i) => s + Number(i.deployedCapital || 0), 0),
        totalReturnsAccruedGhs: investorAccounts.reduce((s, i) => s + Number(i.returnsAccrued || 0), 0),
      };
    } else if (['CUSTOMER_SERVICE', 'RECEPTION'].includes(canonicalRole)) {
      roleSummary = {
        openSupportTickets: tickets.filter((t) => t.status !== 'RESOLVED').length,
        totalSupportTickets: tickets.length,
        recentBorrowersCount: await prisma.member.count({ where }),
      };
    }
  }

  return {
    role: canonicalRole,
    userId,
    tenantId,
    tenant: tenantRecord,
    environmentProvenance,
    capabilities: roleDescriptor,
    timestamp: new Date().toISOString(),
    summary: roleSummary,
    datasets: {
      ...(canLoadLoans ? { recentLoans } : {}),
      ...(canLoadPayments ? { recentPayments } : {}),
      ...(canLoadInvestors ? { investorAccounts } : {}),
      ...(canLoadCases ? { complianceCases } : {}),
      ...(canLoadTickets ? { tickets } : {}),
      ...(canLoadCampaigns ? { campaigns } : {}),
      ...(canLoadMeetings ? { meetings } : {}),
      ...(canLoadCollectors ? { collectors: collectorList } : {}),
      ...(canLoadStaff ? { staff: staffList } : {}),
      ...(canLoadSalaries ? { salaries: salaryRuns } : {}),
      recentActivities,
    },
  };
}

module.exports = {
  getOverview,
  getMetrics,
  getLoanStatusChart,
  getPaymentTrendsChart,
  getRecentActivity,
  getRoleDashboardMetrics,
};
