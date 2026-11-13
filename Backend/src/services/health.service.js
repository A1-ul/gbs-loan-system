const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class HealthService {
  async getSystemHealth() {
    let dbStatus = 'HEALTHY';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'UNHEALTHY';
    }

    return {
      status: dbStatus === 'HEALTHY' ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      database: dbStatus,
      memoryUsage: process.memoryUsage()
    };
  }
}

module.exports = new HealthService();
