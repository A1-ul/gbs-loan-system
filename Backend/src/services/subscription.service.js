const subscriptionRepository = require('../repositories/subscription.repository');

class SubscriptionService {
  async getTenantSubscription(tenantId) {
    return subscriptionRepository.findByTenantId(tenantId);
  }

  async updateSubscription(tenantId, data) {
    return subscriptionRepository.upsertSubscription(tenantId, data);
  }
}

module.exports = new SubscriptionService();
