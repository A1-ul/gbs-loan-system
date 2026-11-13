const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class DeviceRepository {
  async findRefreshTokens(userId) {
    return prisma.refreshToken.findMany({ where: { userId } });
  }
}

module.exports = new DeviceRepository();
