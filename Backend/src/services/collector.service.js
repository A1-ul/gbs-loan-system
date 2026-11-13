const { prisma } = require('../config/database');
const { NotFoundError } = require('../utils/errors');

async function getAll(tenantId = null) {
  const where = { isActive: true };
  if (tenantId) where.tenantId = tenantId;
  return prisma.collector.findMany({
    where,
    include: { user: { select: { firstName: true, lastName: true, phone: true } } },
  });
}

async function getLiveLocations(tenantId = null) {
  const where = { isActive: true, status: { not: 'OFFLINE' } };
  if (tenantId) where.tenantId = tenantId;
  return prisma.collector.findMany({
    where,
    select: {
      id: true,
      tenantId: true,
      employeeId: true,
      status: true,
      lastLatitude: true,
      lastLongitude: true,
      lastSpeed: true,
      lastLocationAt: true,
      assignedZone: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });
}

async function getById(id) {
  const collector = await prisma.collector.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!collector) throw new NotFoundError('Collector');
  return collector;
}

async function getLocationHistory(id, { startDate, endDate }) {
  const where = { collectorId: id };
  if (startDate) where.recordedAt = { gte: new Date(startDate) };
  if (endDate) where.recordedAt = { ...where.recordedAt, lte: new Date(endDate) };

  return prisma.collectorLocationLog.findMany({
    where,
    orderBy: { recordedAt: 'desc' },
    take: 500,
  });
}

async function updateStatus(id, status) {
  return prisma.collector.update({ where: { id }, data: { status } });
}

module.exports = { getAll, getLiveLocations, getById, getLocationHistory, updateStatus };
