const { prisma } = require('../config/database');
const { NotFoundError } = require('../utils/errors');

async function getAll({ page = 1, limit = 20, status, month, year, tenantId } = {}) {
  const where = {};
  if (status) where.status = status;
  if (month) where.month = +month;
  if (year) where.year = +year;
  if (tenantId) where.staff = { tenantId };

  const [data, total] = await Promise.all([
    prisma.staffSalary.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { staff: { include: { user: { select: { firstName: true, lastName: true } } } } },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    }),
    prisma.staffSalary.count({ where }),
  ]);

  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function getSummary(tenantId = null) {
  const now = new Date();
  const scope = tenantId ? { staff: { tenantId } } : {};
  const [pending, paid, totalPending] = await Promise.all([
    prisma.staffSalary.count({ where: { ...scope, status: 'PENDING', month: now.getMonth() + 1, year: now.getFullYear() } }),
    prisma.staffSalary.count({ where: { ...scope, status: 'PAID', month: now.getMonth() + 1, year: now.getFullYear() } }),
    prisma.staffSalary.aggregate({
      where: { ...scope, status: 'PENDING' },
      _sum: { netAmount: true },
    }),
  ]);

  return {
    pendingCount: pending,
    paidCount: paid,
    totalPendingAmount: Number(totalPending._sum.netAmount || 0),
    currency: 'GH₵',
  };
}

async function create(data) {
  const netAmount = data.baseAmount + (data.bonuses || 0) - (data.deductions || 0);

  return prisma.staffSalary.create({
    data: {
      staffId: data.staffId,
      month: data.month,
      year: data.year,
      baseAmount: data.baseAmount,
      bonuses: data.bonuses || 0,
      deductions: data.deductions || 0,
      netAmount,
    },
  });
}

async function processPayment(id, userId, { notes }) {
  const salary = await prisma.staffSalary.findUnique({ where: { id } });
  if (!salary) throw new NotFoundError('Salary record');

  return prisma.staffSalary.update({
    where: { id },
    data: { status: 'PAID', paidAt: new Date(), paidById: userId, notes },
  });
}

module.exports = { getAll, getSummary, create, processPayment };
