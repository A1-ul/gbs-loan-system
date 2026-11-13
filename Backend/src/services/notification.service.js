/**
 * Notification Queue Service - SMS, Email, Push notifications
 */
const { prisma } = require('../config/database');
const { getNotificationQueue } = require('../queues/notification.queue');
const smsService = require('../integrations/sms.service');
const emailService = require('../integrations/email.service');
const logger = require('../utils/logger');

async function queue(notification) {
  const record = await prisma.notification.create({
    data: {
      userId: notification.userId,
      type: notification.type,
      category: notification.category,
      title: notification.title,
      message: notification.message,
      recipient: notification.recipient,
      metadata: notification.metadata || {},
      status: 'QUEUED',
    },
  });

  try {
    const bullQueue = getNotificationQueue();
    if (bullQueue) {
      await bullQueue.add('send', { notificationId: record.id }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      }).catch(err => logger.warn(`Notification Queue dispatch warning: ${err.message}`));
    }
  } catch (qErr) {
    logger.warn(`Notification Queue unavailable: ${qErr.message}`);
  }

  return record;
}

async function processNotification(notificationId) {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.status !== 'QUEUED') return;

  try {
    switch (notification.type) {
      case 'SMS':
        await smsService.send(notification.recipient, notification.message);
        break;
      case 'EMAIL':
        await emailService.send(notification.recipient, notification.title, notification.message);
        break;
      case 'PUSH':
        logger.info('Push notification queued:', notification.id);
        break;
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'SENT', sentAt: new Date() },
    });
  } catch (error) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        errorMessage: error.message,
        retryCount: { increment: 1 },
      },
    });
    throw error;
  }
}

async function getByUserId(userId) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

async function getQueueStatus() {
  const bullQueue = getNotificationQueue();
  const [waiting, active, completed, failed] = await Promise.all([
    bullQueue.getWaitingCount(),
    bullQueue.getActiveCount(),
    bullQueue.getCompletedCount(),
    bullQueue.getFailedCount(),
  ]);

  return { waiting, active, completed, failed };
}

async function markAsRead(id) {
  return prisma.notification.update({
    where: { id },
    data: { metadata: { read: true } },
  });
}

async function sendPaymentReminder({ loanId, type }) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { member: { include: { user: true } } },
  });

  const categoryMap = {
    due_today: 'PAYMENT_DUE_TODAY',
    due_week: 'PAYMENT_DUE_WEEK',
    overdue: 'OVERDUE_ALERT',
  };

  return queue({
    userId: loan.member.userId,
    type: 'SMS',
    category: categoryMap[type] || 'PAYMENT_REMINDER',
    title: 'Payment Reminder',
    message: `Reminder: Your loan ${loan.loanNumber} payment is due. Outstanding: GH₵${loan.outstandingAmount}`,
    recipient: loan.member.user.phone,
  });
}

module.exports = {
  queue, processNotification, getByUserId,
  getQueueStatus, markAsRead, sendPaymentReminder,
};
