const express = require('express');
const userCountRoutes = require('./routes/userCount.routes');
const userCountService = require('./services/userCount.service');
const userCountController = require('./controllers/userCount.controller');

const router = express.Router();

router.get('/config', (req, res) => {
  res.json({
    status: 'SUCCESS',
    module: 'ADMINISTRATION',
    systemParameters: {
      defaultInterestRate: 5.0,
      defaultPenaltyRate: 2.0,
      maxLoanLimit: 500000.00,
    },
  });
});

module.exports = {
  administrationRoutes: router,
  userCountRoutes,
  userCountService,
  userCountController,
};
