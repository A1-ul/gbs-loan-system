const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

function buildPooledDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) return undefined;
  try {
    const parsed = new URL(rawUrl);
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', '25');
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', '30');
    }
    if (!parsed.searchParams.has('connect_timeout')) {
      parsed.searchParams.set('connect_timeout', '15');
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

const pooledUrl = buildPooledDatabaseUrl();

const prisma = new PrismaClient({
  ...(pooledUrl ? { datasources: { db: { url: pooledUrl } } } : {}),
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
