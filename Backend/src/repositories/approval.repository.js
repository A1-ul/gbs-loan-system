const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ApprovalRepository {
  async getPendingApprovals() {
    return prisma.loan.findMany({
      where: { status: 'PENDING' },
      include: { member: { include: { user: true } } }
    });
  }
}

module.exports = new ApprovalRepository();
