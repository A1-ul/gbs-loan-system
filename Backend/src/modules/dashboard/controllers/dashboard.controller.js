const dashboardService = require('../services/dashboard.service');
const logger = require('../../../utils/logger');

async function getDashboard(req, res, next) {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    const data = await dashboardService.getRoleDashboardMetrics(userRole, userId);
    return res.status(200).json({
      success: true,
      message: `Dashboard data loaded for role ${userRole}`,
      data,
    });
  } catch (error) {
    logger.error('Error fetching dashboard metrics:', error);
    next(error);
  }
}

module.exports = {
  getDashboard,
};
