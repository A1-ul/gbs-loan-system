const express = require('express');
const router = express.Router();

router.get('/growth', (req, res) => {
  res.json({
    status: 'SUCCESS',
    module: 'MARKETING',
    newLeadsMTD: 350,
    conversions: 112
  });
});

module.exports = { marketingRoutes: router };
