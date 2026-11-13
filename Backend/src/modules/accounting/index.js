const express = require('express');
const router = express.Router();

router.get('/summary', (req, res) => {
  res.json({
    status: 'SUCCESS',
    module: 'ACCOUNTING',
    generalLedger: 'BALANCED',
    cashInHand: 42000000.00,
    timestamp: new Date()
  });
});

module.exports = { accountingRoutes: router };
