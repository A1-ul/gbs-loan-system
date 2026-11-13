const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class LocationRepository {
  async logCollectorLocation(data) {
    return prisma.collectorLocationLog.create({ data });
  }

  async findLogsByCollectorId(collectorId, take = 50) {
    return prisma.collectorLocationLog.findMany({
      where: { collectorId },
      orderBy: { recordedAt: 'desc' },
      take
    });
  }
}

module.exports = new LocationRepository();
