const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');
const { staffAndAbove } = require('../middleware/rbac');

const router = express.Router();

router.get('/overview', authenticate, staffAndAbove, dashboardController.getOverview);
router.get('/metrics', authenticate, staffAndAbove, dashboardController.getMetrics);
router.get('/role/:role', authenticate, dashboardController.getRoleMetrics);
router.get('/my-role', authenticate, dashboardController.getRoleMetrics);
router.get('/loan-chart', authenticate, staffAndAbove, dashboardController.getLoanChart);
router.get('/payment-chart', authenticate, staffAndAbove, dashboardController.getPaymentChart);
router.get('/recent-activity', authenticate, staffAndAbove, dashboardController.getRecentActivity);

module.exports = router;
