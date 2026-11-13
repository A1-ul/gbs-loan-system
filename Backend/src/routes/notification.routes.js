const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth');
const { staffAndAbove } = require('../middleware/rbac');

const router = express.Router();

router.get('/', authenticate, notificationController.getMyNotifications);
router.get('/queue/status', authenticate, staffAndAbove, notificationController.getQueueStatus);
router.put('/:id/read', authenticate, notificationController.markAsRead);
router.post('/send-reminder', authenticate, staffAndAbove, notificationController.sendPaymentReminder);

module.exports = router;
