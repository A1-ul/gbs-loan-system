const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth');
const { staffAndAbove, managementAndAbove } = require('../middleware/rbac');

const router = express.Router();

router.get('/', authenticate, notificationController.getMyNotifications);
router.get('/broadcasts', authenticate, staffAndAbove, notificationController.getBroadcastInbox);
router.post('/broadcast', authenticate, managementAndAbove, notificationController.broadcastToStaff);
router.get('/repayment-alerts', authenticate, staffAndAbove, notificationController.getRepaymentAlerts);
router.post('/repayment-alerts/dispatch-staff', authenticate, staffAndAbove, notificationController.dispatchStaffCollectionReminders);
router.get('/queue/status', authenticate, staffAndAbove, notificationController.getQueueStatus);
router.put('/:id/read', authenticate, notificationController.markAsRead);
router.post('/send-reminder', authenticate, staffAndAbove, notificationController.sendPaymentReminder);

module.exports = router;
