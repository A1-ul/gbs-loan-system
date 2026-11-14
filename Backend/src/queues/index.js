const Bull = require('bull');
const { createRedisClient, isRedisConfigured } = require('../config/redis');
const logger = require('../utils/logger');

let notificationQueue = null;

function getNotificationQueue() {
  if (!isRedisConfigured()) {
    return null;
  }
  if (!notificationQueue) {
    try {
      notificationQueue = new Bull('notifications', {
        createClient: () => createRedisClient({ maxRetriesPerRequest: null, enableReadyCheck: false }),
      });
      notificationQueue.on('error', (err) => {
        logger.warn(`Notification Queue Redis warning: ${err.message}`);
      });
    } catch (err) {
      logger.warn(`Failed to initialize Bull Queue: ${err.message}`);
    }
  }
  return notificationQueue;
}

function initializeQueues() {
  try {
    getNotificationQueue();
  } catch (err) {
    logger.warn(`Initialize queues warning: ${err.message}`);
  }
}

module.exports = { getNotificationQueue, initializeQueues };
