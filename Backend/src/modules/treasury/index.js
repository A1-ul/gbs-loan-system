const express = require('express');
const router = express.Router();

router.get('/reserves', (req, res) => {
  res.json({
    status: 'SUCCESS',
    module: 'TREASURY',
    vaultReserves: 6200000.00,
    liquidityRatio: 1.84
  });
});

module.exports = { treasuryRoutes: router };
