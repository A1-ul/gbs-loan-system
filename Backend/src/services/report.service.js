const { prisma } = require('../config/database');

async function loanReport(query = {}) {
  const where = {
    ...(query.tenantId ? { tenantId: query.tenantId } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  const loans = await prisma.loan.findMany({
    where,
    include: { member: { include: { user: { select: { firstName: true, lastName: true } } } } },
    orderBy: { createdAt: 'desc' },
  });

  const totalPrincipal = loans.reduce((s, l) => s + Number(l.principalAmount || 0), 0);
  const totalOutstanding = loans.reduce((s, l) => s + Number(l.outstandingAmount || 0), 0);
  const totalCollected = loans.reduce((s, l) => s + Number(l.amountPaid || 0), 0);

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

  const totalAmount = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
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
      include: { user: { select: { firstName: true, lastName: true, phone: true } }, visits: true },
    }),
    prisma.customerVisit.findMany({ where, orderBy: { visitedAt: 'desc' } }),
  ]);

  const totalFieldCollected = visits.reduce((s, v) => s + Number(v.amountCollected || 0), 0);
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
    include: { user: { select: { firstName: true, lastName: true, email: true, role: true, status: true } }, salaryProfile: true, salaries: true },
  });
  const totalBasePayroll = staff.reduce((s, st) => s + Number(st.salaryProfile?.totalComputedSalary || st.baseSalary || 0), 0);

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
      user: { select: { firstName: true, lastName: true, phone: true } },
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
    include: { member: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } } },
    orderBy: { outstandingAmount: 'desc' },
  });

  const totalOutstanding = loans.reduce((s, l) => s + Number(l.outstandingAmount || 0), 0);
  const overdueLoans = loans.filter((l) => l.status === 'OVERDUE' || l.status === 'DEFAULTED').length;

  return {
    reportType: 'outstanding',
    generatedAt: new Date().toISOString(),
    summary: { activeAccounts: loans.length, overdueAccounts: overdueLoans, totalOutstanding },
    rows: loans,
  };
}

async function generate(body = {}, generatedById = null) {
  const reportType = String(body.reportType || body.type || 'loan').toLowerCase();
  const builders = {
    loan: loanReport,
    payment: paymentReport,
    collection: collectionReport,
    staff: staffReport,
    guarantor: guarantorReport,
    outstanding: outstandingReport,
  };
  const builder = builders[reportType] || loanReport;
  const payload = await builder(body);

  const snapshot = await prisma.reportSnapshot.create({
    data: {
      tenantId: body.tenantId || null,
      reportType: reportType.toUpperCase(),
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
    take: 30,
  });
}

module.exports = {
  generate,
  generateReport: (t, s, e, u) => generate({ reportType: t, periodStart: s, periodEnd: e }, u),
  listReports,
  loanReport,
  paymentReport,
  collectionReport,
  staffReport,
  guarantorReport,
  outstandingReport,
};
