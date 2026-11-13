const Bull = require('bull');
const config = require('../config');
const logger = require('../utils/logger');

let migrationQueue = null;

function getMigrationQueue() {
  if (!migrationQueue) {
    try {
      migrationQueue = new Bull('gbs-migrations', {
        redis: {
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        },
      });
      migrationQueue.on('error', (err) => logger.warn(`Migration Queue warning: ${err.message}`));
    } catch (err) {
      logger.warn(`Migration Queue init warning: ${err.message}`);
    }
  }
  return migrationQueue;
}

function registerMigrationProcessor(processorFn) {
  const queue = getMigrationQueue();
  if (!queue) return null;
  queue.process(async (job) => {
    logger.info(`[MigrationQueue] Processing queued batch job ${job.id}`);
    return processorFn(job.data.jobId, job.data.records, job.data.options);
  });
  return queue;
}

module.exports = {
  getMigrationQueue,
  registerMigrationProcessor,
};
