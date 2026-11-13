const express = require('express');
const router = express.Router();

router.get('/contracts', (req, res) => {
  res.json({
    status: 'SUCCESS',
    module: 'LEGAL',
    pendingContracts: 0,
    activeAgreements: 142
  });
});

module.exports = { legalRoutes: router };
