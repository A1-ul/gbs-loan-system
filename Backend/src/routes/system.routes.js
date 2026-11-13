const express = require('express');
const systemController = require('../controllers/system.controller');
const { authenticate } = require('../middleware/auth');
const { managerOnly } = require('../middleware/rbac');
const { sensitiveOpLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/status', authenticate, systemController.getStatus);
router.get('/health', systemController.getHealth);
router.post('/backup', authenticate, managerOnly, sensitiveOpLimiter, systemController.triggerBackup);
router.get('/backups', authenticate, managerOnly, systemController.getBackupHistory);

module.exports = router;
