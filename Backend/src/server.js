require('dotenv').config();

const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
const { connectDatabase } = require('./config/database');
const { startMetricsServer } = require('./config/prometheus');
const { initializeQueues } = require('./queues');
const { scheduleJobs } = require('./jobs/scheduler');
const { initSocket } = require('./config/socket');
const { printModuleLoaderSummary, printStartupSequence, loadModules } = require('./framework/moduleLoader');

const PORT = config.app.port;

async function bootstrap() {
  try {
    const moduleSummary = loadModules();
    printModuleLoaderSummary(moduleSummary);

    await connectDatabase();

    initializeQueues();

    scheduleJobs();

    if (config.metrics.enabled) {
      startMetricsServer();
    }

    printStartupSequence(config);

    const server = app.listen(PORT, () => {
      if (process.send) process.send('ready');
    });
    initSocket(server);

    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

