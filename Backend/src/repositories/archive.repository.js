const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class ArchiveRepository {
  async findSoftDeletedUsers() {
    return prisma.user.findMany({
      where: { deletedAt: { not: null } }
    });
  }
}

module.exports = new ArchiveRepository();
