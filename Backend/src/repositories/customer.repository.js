const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class CustomerRepository {
  async findConsents(userId) {
    return prisma.userConsent.findMany({
      where: { userId }
    });
  }

  async setConsent(userId, consentType, granted) {
    return prisma.userConsent.upsert({
      where: { userId_consentType: { userId, consentType } },
      update: { granted, grantedAt: new Date() },
      create: { userId, consentType, granted, grantedAt: new Date() }
    });
  }
}

module.exports = new CustomerRepository();
