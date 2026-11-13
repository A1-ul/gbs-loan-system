const { prisma } = require('../config/database');
const { NotFoundError } = require('../utils/errors');

async function getAll({ page = 1, limit = 50, action, entityType, userId, tenantId } = {}) {
  const where = {};
  if (tenantId) where.tenantId = tenantId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (userId) where.userId = userId;

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

async function getById(id) {
  const log = await prisma.auditLog.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!log) throw new NotFoundError('Audit log');
  return log;
}

async function getByEntity(entityType, entityId) {
  return prisma.auditLog.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: 'desc' },
  });
}

module.exports = { getAll, getById, getByEntity };
