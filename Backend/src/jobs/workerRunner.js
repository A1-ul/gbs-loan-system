require('dotenv').config();

const logger = require('../utils/logger');
const { connectDatabase } = require('../config/database');
const { initializeQueues } = require('../queues');
const { scheduleJobs } = require('./scheduler');

async function startWorker() {
  try {
    logger.info('Starting GBS Loan System Background Worker & Cron Scheduler...');
    await connectDatabase();
    initializeQueues();
    scheduleJobs();
    logger.info('GBS Background Worker active and processing queues + scheduled countdown sweeps.');
  } catch (err) {
    logger.error('Background worker failed to boot:', err);
    process.exit(1);
  }
}

startWorker();

