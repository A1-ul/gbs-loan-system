const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SubscriptionRepository {
  async findByTenantId(tenantId) {
    return prisma.tenantSubscription.findUnique({
      where: { tenantId }
    });
  }

  async upsertSubscription(tenantId, data) {
    return prisma.tenantSubscription.upsert({
      where: { tenantId },
      update: data,
      create: { tenantId, ...data }
    });
  }
}

module.exports = new SubscriptionRepository();
