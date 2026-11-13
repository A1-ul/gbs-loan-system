const healthService = require('../services/health.service');

class HealthController {
  async checkHealth(req, res, next) {
    try {
      const data = await healthService.getSystemHealth();
      res.status(data.status === 'UP' ? 200 : 503).json(data);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new HealthController();
