const express = require('express');
const router = express.Router();

router.get('/alerts', (req, res) => {
  res.json({
    status: 'SUCCESS',
    module: 'FRAUD_INVESTIGATION',
    flaggedTransactions: 0,
    securityLevel: 'MAXIMUM'
  });
});

module.exports = { fraudInvestigationRoutes: router };
