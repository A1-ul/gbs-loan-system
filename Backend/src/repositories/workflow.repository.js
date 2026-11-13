const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class WorkflowRepository {
  async getLoanWorkflowHistory(loanId) {
    return prisma.loanWorkflowLog.findMany({
      where: { loanId },
      orderBy: { createdAt: 'desc' }
    });
  }
}

module.exports = new WorkflowRepository();
