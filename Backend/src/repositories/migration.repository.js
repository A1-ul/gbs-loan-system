const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class MigrationRepository {
  async createJob(data) {
    return prisma.migrationJob.create({
      data
    });
  }

  async findById(id) {
    return prisma.migrationJob.findUnique({
      where: { id }
    });
  }

  async updateProgress(id, { processedRecords, failedRecords, status, errorLog }) {
    return prisma.migrationJob.update({
      where: { id },
      data: {
        processedRecords,
        failedRecords,
        status,
        errorLog
      }
    });
  }

  async findAll({ skip = 0, take = 20 }) {
    const [total, jobs] = await Promise.all([
      prisma.migrationJob.count(),
      prisma.migrationJob.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      })
    ]);
    return { total, jobs };
  }
}

module.exports = new MigrationRepository();
