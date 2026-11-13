const notificationService = require('../services/notification.service');
const { success } = require('../utils/response');

async function getMyNotifications(req, res, next) {
  try {
    const notifications = await notificationService.getByUserId(req.user.id);
    return success(res, notifications);
  } catch (err) { next(err); }
}

async function getQueueStatus(req, res, next) {
  try {
    const status = await notificationService.getQueueStatus();
    return success(res, status);
  } catch (err) { next(err); }
}

async function markAsRead(req, res, next) {
  try {
    await notificationService.markAsRead(req.params.id);
    return success(res, null, 'Notification marked as read');
  } catch (err) { next(err); }
}

async function sendPaymentReminder(req, res, next) {
  try {
    const result = await notificationService.sendPaymentReminder(req.body);
    return success(res, result, 'Reminder queued');
  } catch (err) { next(err); }
}

module.exports = { getMyNotifications, getQueueStatus, markAsRead, sendPaymentReminder };
