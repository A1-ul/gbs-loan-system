const { getNotificationQueue } = require('./index');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');

function setupNotificationProcessor() {
  const queue = getNotificationQueue();

  queue.process('send', async (job) => {
    await notificationService.processNotification(job.data.notificationId);
  });

  queue.on('completed', (job) => {
    logger.info(`Notification job ${job.id} completed`);
  });

  queue.on('failed', (job, err) => {
    logger.error(`Notification job ${job.id} failed:`, err.message);
  });
}

module.exports = { setupNotificationProcessor, getNotificationQueue };
