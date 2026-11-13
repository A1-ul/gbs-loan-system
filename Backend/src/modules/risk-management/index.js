const express = require('express');
const router = express.Router();

router.get('/metrics', (req, res) => {
  res.json({
    status: 'SUCCESS',
    module: 'RISK_MANAGEMENT',
    portfolioAtRisk: 1.1,
    riskRating: 'LOW_RISK',
    nplRatio: 1.4
  });
});

module.exports = { riskManagementRoutes: router };
