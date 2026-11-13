const dashboardService = require('../services/dashboard.service');
const { success } = require('../utils/response');

async function getOverview(req, res, next) {
  try {
    const overview = await dashboardService.getOverview(req.tenantId || null);
    return success(res, overview);
  } catch (err) {
    next(err);
  }
}

async function getMetrics(req, res, next) {
  try {
    const metrics = await dashboardService.getMetrics(req.tenantId || null, req.user?.id, req.user?.role);
    return success(res, metrics);
  } catch (err) {
    next(err);
  }
}

async function getRoleMetrics(req, res, next) {
  try {
    const targetRole = req.params.role || req.user?.role;
    const data = await dashboardService.getRoleDashboardMetrics(targetRole, req.user?.id, req.tenantId || null);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

async function getLoanChart(req, res, next) {
  try {
    const chart = await dashboardService.getLoanStatusChart(req.tenantId || null);
    return success(res, chart);
  } catch (err) {
    next(err);
  }
}

async function getPaymentChart(req, res, next) {
  try {
    const chart = await dashboardService.getPaymentTrendsChart(req.tenantId || null);
    return success(res, chart);
  } catch (err) {
    next(err);
  }
}

async function getRecentActivity(req, res, next) {
  try {
    const activity = await dashboardService.getRecentActivity(req.tenantId || null);
    return success(res, activity);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOverview,
  getMetrics,
  getRoleMetrics,
  getLoanChart,
  getPaymentChart,
  getRecentActivity,
};
