const { prisma } = require('../config/database');
const logger = require('../utils/logger');
const { NotFoundError } = require('../utils/errors');

async function create(data) {
  const employeeId = data.employeeId || `EMP-${Date.now().toString().slice(-6)}`;
  const staff = await prisma.staff.create({
    data: {
      tenantId: data.tenantId || null,
      branchId: data.branchId || null,
      userId: data.userId,
      employeeId,
      department: data.department || 'Operations',
      position: data.position || 'Loan Officer',
      hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
      baseSalary: Number(data.baseSalary || 2500),
    },
    include: { user: true },
  });
  logger.info(`Staff record created: ${staff.employeeId}`);
  return staff;
}

async function getAll({ page = 1, limit = 20, tenantId = null }) {
  const skip = (page - 1) * limit;
  const where = tenantId ? { tenantId } : {};
  const [data, total] = await Promise.all([
    prisma.staff.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, status: true, qualificationVerified: true } },
        salaryProfile: { include: { qualificationLevel: true, salaryGrade: true, salaryStep: true, serviceBand: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.staff.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getById(id) {
  const staff = await prisma.staff.findFirst({
    where: { OR: [{ id }, { userId: id }, { employeeId: id }] },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, status: true } },
      salaryProfile: { include: { qualificationLevel: true, salaryGrade: true, salaryStep: true, serviceBand: true, incrementHistory: true } },
      salaries: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!staff) throw new NotFoundError(`Staff record '${id}'`);
  return staff;
}

async function update(id, data) {
  const staff = await getById(id);
  return prisma.staff.update({
    where: { id: staff.id },
    data: {
      ...(data.department !== undefined ? { department: data.department } : {}),
      ...(data.position !== undefined ? { position: data.position } : {}),
      ...(data.baseSalary !== undefined ? { baseSalary: Number(data.baseSalary) } : {}),
      ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
    },
    include: { user: true, salaryProfile: true },
  });
}

async function deactivate(id) {
  const staff = await getById(id);
  await prisma.$transaction(async (tx) => {
    await tx.staff.update({ where: { id: staff.id }, data: { isActive: false } });
    await tx.user.update({ where: { id: staff.userId }, data: { status: 'DEACTIVATED' } });
  });
  logger.warn(`Staff record deactivated: ${staff.employeeId}`);
  return { deactivated: true, employeeId: staff.employeeId };
}

module.exports = {
  create,
  getAll,
  getById,
  update,
  deactivate,
};
