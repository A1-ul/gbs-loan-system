const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AuditRepository {
  async createLog(data) {
    return prisma.auditLog.create({
      data
    });
  }

  async findAll({ skip = 0, take = 50, userId, action, entityType }) {
    const where = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { total, logs };
  }
}

module.exports = new AuditRepository();
