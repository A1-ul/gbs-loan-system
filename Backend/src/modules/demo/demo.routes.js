const express = require('express');
const demoService = require('./demo.service');
const { authLimiter } = require('../../middleware/rateLimiter');
const { success } = require('../../utils/response');

const router = express.Router();

router.get('/walkthrough-catalog', (req, res) => {
  return success(res, demoService.getWalkthroughCatalog());
});

router.post('/walkthrough-session', authLimiter, async (req, res, next) => {
  try {
    const role = req.body?.role || 'COMPANY_OWNER';
    const result = await demoService.issueDemoWalkthroughSession(role, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return success(res, result, `Demo walkthrough session activated for ${result.user.role}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

