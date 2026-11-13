const express = require('express');
const voiceController = require('./voice.controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.post('/enroll', authenticate, voiceController.enroll);
router.post('/verify', authenticate, voiceController.verify);
router.get('/status', authenticate, voiceController.getStatus);

module.exports = router;
