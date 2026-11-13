const analyticsService = require('../services/analytics.service');

class AnalyticsController {
  async getMetrics(req, res, next) {
    try {
      const data = await analyticsService.getDashboardAnalytics();
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AnalyticsController();
