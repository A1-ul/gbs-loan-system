const analyticsRepository = require('../repositories/analytics.repository');

class AnalyticsService {
  async getDashboardAnalytics() {
    const metrics = await analyticsRepository.getSystemMetrics();
    return {
      status: 'SUCCESS',
      metrics,
      calculatedAt: new Date()
    };
  }
}

module.exports = new AnalyticsService();
