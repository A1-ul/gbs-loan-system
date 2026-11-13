const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
});

prisma.$on('warn', (e) => logger.warn('Prisma warning:', e));
prisma.$on('error', (e) => logger.error('Prisma error:', e));

async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
    return prisma;
  } catch (error) {
    logger.warn(`Database connection warning: ${error.message}. Server will remain operational with retry logic.`);
    return prisma;
  }
}

async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
  } catch (error) {
    logger.error('Error disconnecting database:', error);
  }
}

async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', connected: true };
  } catch (error) {
    return { status: 'unhealthy', connected: false, error: error.message };
  }
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
};
