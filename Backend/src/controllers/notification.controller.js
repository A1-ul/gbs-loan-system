const notificationService = require('../services/notification.service');
const { success, created } = require('../utils/response');

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
    return success(res, result, 'Reminder dispatched');
  } catch (err) { next(err); }
}

async function broadcastToStaff(req, res, next) {
  try {
    const result = await notificationService.broadcastToStaff(req.user, {
      ...req.body,
      tenantId: req.tenantId || req.user?.tenantId,
    });
    return created(res, result, `Message sent to ${result.recipientCount} staff member(s)`);
  } catch (err) { next(err); }
}

async function getBroadcastInbox(req, res, next) {
  try {
    const inbox = await notificationService.getBroadcastInbox(req.user);
    return success(res, inbox);
  } catch (err) { next(err); }
}

async function getRepaymentAlerts(req, res, next) {
  try {
    const data = await notificationService.getRepaymentAlerts(req.tenantId || req.user?.tenantId);
    return success(res, data);
  } catch (err) { next(err); }
}

async function dispatchStaffCollectionReminders(req, res, next) {
  try {
    const data = await notificationService.dispatchStaffCollectionReminders(req.user, req.tenantId || req.user?.tenantId);
    return success(res, data, `Dispatched payment collection reminders to ${data.notifiedStaffCount} staff member(s)`);
  } catch (err) { next(err); }
}

module.exports = {
  getMyNotifications,
  getQueueStatus,
  markAsRead,
  sendPaymentReminder,
  broadcastToStaff,
  getBroadcastInbox,
  getRepaymentAlerts,
  dispatchStaffCollectionReminders,
};
