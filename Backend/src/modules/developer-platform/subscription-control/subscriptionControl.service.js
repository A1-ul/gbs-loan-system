const { prisma } = require('../../../config/database');
const countdownEngine = require('../../tenant/countdownEngine.service');
const trialExpiration = require('../../tenant/trialExpiration.service');

class SubscriptionControlService {
  async listSubscriptions() {
    await countdownEngine.sweepAllTenants();
    return prisma.tenant.findMany({
      where: { code: { not: 'DEMO-SANDBOX' } },
      include: {
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { users: true, members: true, loans: true, branches: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTenantSubscription(tenantId) {
    return countdownEngine.getTenantCountdown(tenantId);
  }

  async updateSubscription(tenantId, { extensionDays = 90, action = 'RENEW', reason, planName } = {}) {
    if (action === 'LOCK') {
      return trialExpiration.lockTenant(tenantId, reason || 'Developer Administrative Lock');
    }
    if (planName) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { planTier: planName },
      }).catch(() => {});
    }
    return trialExpiration.unlockTenant(tenantId, parseInt(extensionDays, 10) || 90, reason || 'Developer Subscription Extension');
  }
}

module.exports = new SubscriptionControlService();
