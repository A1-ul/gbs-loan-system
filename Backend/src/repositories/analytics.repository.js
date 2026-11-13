const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class AnalyticsRepository {
  async getSystemMetrics() {
    const [totalUsers, totalLoans, totalPayments, totalMembers] = await Promise.all([
      prisma.user.count(),
      prisma.loan.count(),
      prisma.payment.count(),
      prisma.member.count()
    ]);
    return { totalUsers, totalLoans, totalPayments, totalMembers };
  }
}

module.exports = new AnalyticsRepository();
