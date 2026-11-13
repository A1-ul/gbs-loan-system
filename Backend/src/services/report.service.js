const { prisma } = require('../config/database');
const { toCents, fromCents } = require('./loanEngine.service');

async function loanReport(query = {}) {
  const where = {
    ...(query.tenantId ? { tenantId: query.tenantId } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  const loans = await prisma.loan.findMany({
    where,
    include: { member: { include: { user: { select: { firstName: true, lastName: true, phone: true, gpsAddress: true } } } } },
    orderBy: { createdAt: 'desc' },
  });

  const totalPrincipal = fromCents(loans.reduce((s, l) => s + toCents(l.principalAmount), 0));
  const totalOutstanding = fromCents(loans.reduce((s, l) => s + toCents(l.outstandingAmount), 0));
  const totalCollected = fromCents(loans.reduce((s, l) => s + toCents(l.amountPaid), 0));

  return {
    reportType: 'loan',
    generatedAt: new Date().toISOString(),
    summary: { count: loans.length, totalPrincipal, totalCollected, totalOutstanding },
    rows: loans,
  };
}

async function paymentReport(query = {}) {
  const where = {
    ...(query.tenantId ? { tenantId: query.tenantId } : {}),
    ...(query.method ? { method: query.method } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  const payments = await prisma.payment.findMany({
    where,
    include: { loan: { select: { loanNumber: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const totalAmount = fromCents(payments.reduce((s, p) => s + toCents(p.amount), 0));
  return {
    reportType: 'payment',
    generatedAt: new Date().toISOString(),
    summary: { count: payments.length, totalAmount },
    rows: payments,
  };
}

async function collectionReport(query = {}) {
  const where = query.tenantId ? { tenantId: query.tenantId } : {};
  const [collectors, visits] = await Promise.all([
    prisma.collector.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, phone: true, gpsAddress: true } }, visits: true },
    }),
    prisma.customerVisit.findMany({ where, orderBy: { visitedAt: 'desc' } }),
  ]);

  const totalFieldCollected = fromCents(visits.reduce((s, v) => s + toCents(v.amountCollected), 0));
  return {
    reportType: 'collection',
    generatedAt: new Date().toISOString(),
    summary: { collectorsCount: collectors.length, visitsCount: visits.length, totalFieldCollected },
    rows: visits,
    collectors,
  };
}

async function staffReport(query = {}) {
  const where = query.tenantId ? { tenantId: query.tenantId } : {};
  const staff = await prisma.staff.findMany({
    where,
    include: { user: { select: { firstName: true, lastName: true, email: true, role: true, status: true, gpsAddress: true } }, salaryProfile: true, salaries: true },
  });
  const totalBasePayroll = fromCents(
    staff.reduce((s, st) => s + toCents(st.salaryProfile?.totalComputedSalary || st.baseSalary), 0)
  );

  return {
    reportType: 'staff',
    generatedAt: new Date().toISOString(),
    summary: { totalStaff: staff.length, activeStaff: staff.filter((s) => s.isActive).length, totalMonthlyPayroll: totalBasePayroll },
    rows: staff,
  };
}

async function guarantorReport(query = {}) {
  const where = query.tenantId ? { tenantId: query.tenantId } : {};
  const guarantors = await prisma.guarantor.findMany({
    where,
    include: {
      user: { select: { firstName: true, lastName: true, phone: true, gpsAddress: true } },
      loanGuarantors: { include: { loan: { select: { loanNumber: true, status: true, outstandingAmount: true } } } },
    },
  });

  return {
    reportType: 'guarantor',
    generatedAt: new Date().toISOString(),
    summary: { totalGuarantors: guarantors.length, signedAgreements: guarantors.filter((g) => g.agreementSigned).length },
    rows: guarantors,
  };
}

async function outstandingReport(query = {}) {
  const where = {
    ...(query.tenantId ? { tenantId: query.tenantId } : {}),
    status: { in: ['ONGOING', 'OVERDUE', 'DEFAULTED', 'DISBURSED'] },
  };
  const loans = await prisma.loan.findMany({
    where,
    include: { member: { include: { user: { select: { firstName: true, lastName: true, phone: true, gpsAddress: true } } } } },
    orderBy: { outstandingAmount: 'desc' },
  });

  const totalOutstanding = fromCents(loans.reduce((s, l) => s + toCents(l.outstandingAmount), 0));
  const overdueLoans = loans.filter((l) => l.status === 'OVERDUE' || l.status === 'DEFAULTED').length;

  return {
    reportType: 'outstanding',
    generatedAt: new Date().toISOString(),
    summary: { activeAccounts: loans.length, overdueAccounts: overdueLoans, totalOutstanding },
    rows: loans,
  };
}

function resolvePeriodWindow(period = 'WEEKLY', referenceDate = null) {
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  const mode = String(period || 'WEEKLY').toUpperCase();
  const end = new Date(ref);
  end.setHours(23, 59, 59, 999);
  const start = new Date(ref);

  if (mode === 'YEARLY') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setMonth(11, 31);
    return {
      periodType: 'YEARLY',
      periodLabel: `FY-${start.getFullYear()}`,
      periodStart: start,
      periodEnd: end,
    };
  }

  if (mode === 'MONTHLY') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    const label = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    return {
      periodType: 'MONTHLY',
      periodLabel: `MONTH-${label}`,
      periodStart: start,
      periodEnd: monthEnd,
    };
  }

  // Default: WEEKLY (last 7 calendar days up to reference date)
  start.setDate(ref.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return {
    periodType: 'WEEKLY',
    periodLabel: `WEEK-${start.toISOString().slice(0, 10)}_to_${end.toISOString().slice(0, 10)}`,
    periodStart: start,
    periodEnd: end,
  };
}

/**
 * Wrap and persist Weekly, Monthly, or Yearly institutional performance snapshots
 * consolidating all staff-entered loans, payments, field visits, attendance, customers, and audits.
 */
async function wrapPeriodReport({ period = 'WEEKLY', referenceDate = null, tenantId = null } = {}, generatedById = null) {
  const windowInfo = resolvePeriodWindow(period, referenceDate);
  const dateRange = { gte: windowInfo.periodStart, lte: windowInfo.periodEnd };
  const tenantFilter = tenantId ? { tenantId } : {};

  const [loans, payments, membersCount, visits, attendanceRows, audits, collectorUsers] = await Promise.all([
    prisma.loan.findMany({
      where: { ...tenantFilter, createdAt: dateRange },
      select: {
        id: true, loanNumber: true, principalAmount: true, totalAmount: true,
        amountPaid: true, outstandingAmount: true, status: true, reviewedById: true,
        approvedById: true, disbursedById: true, createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: { ...tenantFilter, createdAt: dateRange },
      select: { id: true, paymentRef: true, amount: true, method: true, status: true, collectedById: true, createdAt: true },
    }),
    prisma.member.count({
      where: { ...tenantFilter, createdAt: dateRange, deletedAt: null },
    }),
    prisma.customerVisit.findMany({
      where: { ...tenantFilter, visitedAt: dateRange },
      select: { id: true, collectorId: true, customerName: true, visitOutcome: true, amountCollected: true, visitedAt: true },
    }),
    prisma.staffAttendance.findMany({
      where: { ...tenantFilter, clockInAt: dateRange },
      select: { userId: true, workDate: true, durationMinutes: true, status: true },
    }),
    prisma.accountingAuditRecord.findMany({
      where: { ...tenantFilter, createdAt: dateRange },
      select: { id: true, auditPeriod: true, variance: true, status: true, auditorName: true },
    }),
    prisma.user.findMany({
      where: { ...tenantFilter, role: { notIn: ['MEMBER', 'MEMBER_PORTAL', 'GUARANTOR', 'GUARANTOR_PORTAL'] } },
      select: { id: true, firstName: true, lastName: true, role: true },
    }),
  ]);

  const userNameMap = new Map(collectorUsers.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));
  const staffBreakdownMap = {};
  const ensureStaffEntry = (staffUserId) => {
    const key = staffUserId || 'SYSTEM';
    if (!staffBreakdownMap[key]) {
      staffBreakdownMap[key] = {
        staffUserId: key,
        staffName: userNameMap.get(key) || (key === 'SYSTEM' ? 'Automated / Self-Service' : key),
        loansProcessed: 0,
        loansPrincipalGhs: 0,
        paymentsCollectedCount: 0,
        paymentsCollectedCents: 0,
        attendanceShifts: 0,
        attendanceMinutes: 0,
      };
    }
    return staffBreakdownMap[key];
  };

  let disbursedCents = 0;
  for (const l of loans) {
    const actor = l.disbursedById || l.approvedById || l.reviewedById || 'SYSTEM';
    const entry = ensureStaffEntry(actor);
    entry.loansProcessed += 1;
    entry.loansPrincipalGhs = fromCents(toCents(entry.loansPrincipalGhs) + toCents(l.principalAmount));
    if (['DISBURSED', 'ONGOING', 'PAID', 'OVERDUE', 'DEFAULTED', 'CLOSED'].includes(l.status)) {
      disbursedCents += toCents(l.principalAmount);
    }
  }

  let completedPaymentCents = 0;
  let cashPaymentCents = 0;
  let momoPaymentCents = 0;
  let bankPaymentCents = 0;
  for (const p of payments) {
    const amtCents = toCents(p.amount);
    if (p.status === 'COMPLETED') {
      completedPaymentCents += amtCents;
      if (p.method === 'CASH') cashPaymentCents += amtCents;
      else if (p.method === 'MOMO') momoPaymentCents += amtCents;
      else bankPaymentCents += amtCents;
    }
    const entry = ensureStaffEntry(p.collectedById || 'SYSTEM');
    entry.paymentsCollectedCount += 1;
    if (p.status === 'COMPLETED') entry.paymentsCollectedCents += amtCents;
  }

  for (const a of attendanceRows) {
    const entry = ensureStaffEntry(a.userId);
    entry.attendanceShifts += 1;
    entry.attendanceMinutes += Number(a.durationMinutes || 0);
  }

  const staffBreakdown = Object.values(staffBreakdownMap).map((row) => ({
    ...row,
    paymentsCollectedGhs: fromCents(row.paymentsCollectedCents),
  }));

  const wrappedData = {
    reportType: `WRAPPED_${windowInfo.periodType}`,
    periodType: windowInfo.periodType,
    periodLabel: windowInfo.periodLabel,
    periodStart: windowInfo.periodStart.toISOString(),
    periodEnd: windowInfo.periodEnd.toISOString(),
    generatedAt: new Date().toISOString(),
    summary: {
      totalLoansOriginated: loans.length,
      totalPrincipalDisbursedGhs: fromCents(disbursedCents),
      totalCompletedCollectionsCount: payments.filter((p) => p.status === 'COMPLETED').length,
      totalCollectedGhs: fromCents(completedPaymentCents),
      cashCollectedGhs: fromCents(cashPaymentCents),
      momoCollectedGhs: fromCents(momoPaymentCents),
      bankCollectedGhs: fromCents(bankPaymentCents),
      newCustomersRegistered: membersCount,
      fieldVisitsCompleted: visits.length,
      totalFieldVisitsCollectedGhs: fromCents(visits.reduce((s, v) => s + toCents(v.amountCollected), 0)),
      attendanceShiftsLogged: attendanceRows.length,
      auditsCompleted: audits.length,
    },
    staffBreakdown,
    audits,
  };

  return prisma.reportSnapshot.create({
    data: {
      tenantId: tenantId || null,
      reportType: `WRAPPED_${windowInfo.periodType}`,
      periodType: windowInfo.periodType,
      periodLabel: windowInfo.periodLabel,
      periodStart: windowInfo.periodStart,
      periodEnd: windowInfo.periodEnd,
      data: wrappedData,
      generatedById,
    },
  });
}

async function generate(body = {}, generatedById = null) {
  const requestedType = String(body.reportType || body.type || 'loan').toLowerCase();
  if (['weekly', 'monthly', 'yearly'].includes(requestedType)) {
    return wrapPeriodReport({
      period: requestedType.toUpperCase(),
      referenceDate: body.referenceDate || body.periodEnd || null,
      tenantId: body.tenantId || null,
    }, generatedById);
  }

  const builders = {
    loan: loanReport,
    payment: paymentReport,
    collection: collectionReport,
    staff: staffReport,
    guarantor: guarantorReport,
    outstanding: outstandingReport,
  };
  const builder = builders[requestedType] || loanReport;
  const payload = await builder(body);

  const snapshot = await prisma.reportSnapshot.create({
    data: {
      tenantId: body.tenantId || null,
      reportType: requestedType.toUpperCase(),
      periodType: body.periodType || 'CUSTOM',
      periodLabel: body.periodLabel || requestedType.toUpperCase(),
      periodStart: body.periodStart ? new Date(body.periodStart) : new Date(Date.now() - 30 * 86400000),
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : new Date(),
      data: payload,
      generatedById,
    },
  });

  return snapshot;
}

async function listReports(tenantId = null) {
  return prisma.reportSnapshot.findMany({
    where: tenantId ? { tenantId } : {},
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

async function exportSnapshotCsv(id, tenantId = null) {
  const snapshot = await prisma.reportSnapshot.findUnique({ where: { id } });
  if (!snapshot || (tenantId && snapshot.tenantId && snapshot.tenantId !== tenantId)) {
    return null;
  }

  const data = snapshot.data || {};
  const lines = [];
  lines.push(`"Report Type","${snapshot.reportType}"`);
  lines.push(`"Period Type","${snapshot.periodType || 'CUSTOM'}"`);
  lines.push(`"Period Label","${snapshot.periodLabel || ''}"`);
  lines.push(`"Start","${snapshot.periodStart.toISOString()}"`);
  lines.push(`"End","${snapshot.periodEnd.toISOString()}"`);
  lines.push('');
  lines.push('"Metric","Value"');
  for (const [k, v] of Object.entries(data.summary || {})) {
    lines.push(`"${String(k).replace(/"/g, '""')}","${String(v).replace(/"/g, '""')}"`);
  }

  if (Array.isArray(data.staffBreakdown) && data.staffBreakdown.length > 0) {
    lines.push('');
    lines.push('"Staff Member","Loans Processed","Loans Principal (GHS)","Payments Collected (#)","Payments Collected (GHS)","Shifts","Minutes"');
    for (const s of data.staffBreakdown) {
      lines.push(`"${String(s.staffName).replace(/"/g, '""')}",${s.loansProcessed},${s.loansPrincipalGhs},${s.paymentsCollectedCount},${s.paymentsCollectedGhs},${s.attendanceShifts},${s.attendanceMinutes}`);
    }
  }

  return {
    filename: `gbs-${(snapshot.periodLabel || snapshot.reportType).toLowerCase()}.csv`,
    contentType: 'text/csv; charset=utf-8',
    buffer: Buffer.from(lines.join('\n'), 'utf8'),
  };
}

module.exports = {
  generate,
  wrapPeriodReport,
  generateReport: (t, s, e, u) => generate({ reportType: t, periodStart: s, periodEnd: e }, u),
  listReports,
  exportSnapshotCsv,
  loanReport,
  paymentReport,
  collectionReport,
  staffReport,
  guarantorReport,
  outstandingReport,
};
