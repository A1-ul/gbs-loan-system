const { prisma } = require('../../../config/database');

class DeploymentHistoryService {
  async getDeployments() {
    return prisma.deploymentHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async recordDeployment(entry = {}, developerUser = null) {
    return prisma.deploymentHistory.create({
      data: {
        version: entry.version || '2.0.0',
        environment: entry.environment || process.env.APP_ENV || 'production',
        provider: entry.provider || 'render',
        commitSha: entry.commitSha || entry.commitHash || 'HEAD',
        status: entry.status || 'DEPLOYED',
        deployedBy: developerUser?.email || entry.deployedBy || 'Lead Developer Authority',
        notes: entry.notes || 'Render production service deployment recorded',
      },
    });
  }
}

module.exports = new DeploymentHistoryService();
