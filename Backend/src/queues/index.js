const Bull = require('bull');
const config = require('../config');
const logger = require('../utils/logger');

let notificationQueue = null;

function getNotificationQueue() {
  if (!notificationQueue) {
    try {
      notificationQueue = new Bull('notifications', {
        redis: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        },
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
