const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class TenantRepository {
  async findLocations(tenantId) {
    return prisma.tenantLocation.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createLocation(data) {
    return prisma.tenantLocation.create({
      data
    });
  }
}

module.exports = new TenantRepository();
