const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ReportRepository {
  async createSnapshot(data) {
    return prisma.reportSnapshot.create({ data });
  }

  async findSnapshots(reportType) {
    return prisma.reportSnapshot.findMany({
      where: reportType ? { reportType } : {},
      orderBy: { createdAt: 'desc' }
    });
  }
}

module.exports = new ReportRepository();
