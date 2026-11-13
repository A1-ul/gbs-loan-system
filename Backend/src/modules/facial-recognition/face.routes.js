const express = require('express');
const { authenticate } = require('../../middleware/auth');
const facialService = require('./facial.service');

const router = express.Router();

router.get('/status', authenticate, (req, res) => {
  res.json({
    success: true,
    data: {
      facialEnrolled: Boolean(req.user.facialEnrolled),
      userId: req.user.id,
    },
  });
});

router.post('/enroll', authenticate, async (req, res, next) => {
  try {
    const result = await facialService.enrollFacialProfile(req.user.id, req.body);
    res.json({ success: true, message: 'Facial biometric profile enrolled', data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/verify', authenticate, async (req, res, next) => {
  try {
    const result = await facialService.verifyFacialScan(req.user.id, req.body, req.ip);
    if (!result.passed) {
      return res.status(401).json({ success: false, message: result.message, data: result });
    }
    return res.json({ success: true, message: result.message, data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
