const { prisma } = require('../../../config/database');

class SecurityAlertsService {
  async getActiveAlerts() {
    const alerts = await prisma.securityAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unresolved = alerts.filter((a) => !a.resolved);

    return {
      activeAlertsCount: unresolved.length,
      threatLevel: unresolved.some((a) => a.severity === 'CRITICAL') ? 'ELEVATED' : 'SECURE_NORMAL',
      wafStatus: 'ENFORCING',
      alerts,
    };
  }

  async createAlert(alertData) {
    return prisma.securityAlert.create({
      data: {
        tenantId: alertData.tenantId || null,
        alertType: alertData.alertType || 'SECURITY_NOTICE',
        severity: alertData.severity || 'MEDIUM',
        title: alertData.title || 'Security Event Recorded',
        description: alertData.description || alertData.details || 'Security event recorded by Developer Control.',
        ipAddress: alertData.ipAddress || null,
      },
    });
  }

  async resolveAlert(id) {
    return prisma.securityAlert.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });
  }
}

module.exports = new SecurityAlertsService();
