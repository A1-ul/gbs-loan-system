const os = require('os');
const { prisma } = require('../config/database');
const { checkDatabaseHealth } = require('../config/database');
const { checkRedisHealth } = require('../config/redis');
const backupService = require('./backup.service');
const config = require('../config');
const { getEnvironmentProfile } = require('../config/environments');

async function getSystemStatus() {
  const envProfile = getEnvironmentProfile();
  const [dbHealth, redisHealth, lastBackup] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
    prisma.systemBackup.findFirst({ orderBy: { createdAt: 'desc' } }),
  ]);

  return {
    environment: envProfile.nodeEnv,
    environmentTag: envProfile.environmentTag,
    dataMode: envProfile.isProduction ? 'PRODUCTION_LIVE' : 'DEVELOPMENT_DEMO',
    isProduction: envProfile.isProduction,
    allowSeeders: envProfile.allowSeeders,
    server: {
      status: 'Online',
      uptime: formatUptime(process.uptime()),
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      cpuUsagePercent: os.loadavg()[0],
    },
    database: {
      status: dbHealth.connected ? 'Connected' : 'Disconnected',
      ...dbHealth,
    },
    redis: redisHealth,
    backup: {
      status: lastBackup?.status || 'No backups yet',
      lastBackupAt: lastBackup?.completedAt || null,
      autoBackupEnabled: config.backup.enabled,
    },
    pm2: {
      clusterMode: true,
      autoRestart: true,
    },
  };
}

async function getHealthCheck() {
  const envProfile = getEnvironmentProfile();
  const db = await checkDatabaseHealth();
  const redis = await checkRedisHealth();

  const healthy = db.connected && (redis.connected || redis.mode === 'in-memory');

  return {
    status: healthy ? 'healthy' : 'degraded',
    environment: envProfile.nodeEnv,
    environmentTag: envProfile.environmentTag,
    dataMode: envProfile.isProduction ? 'PRODUCTION_LIVE' : 'DEVELOPMENT_DEMO',
    isProduction: envProfile.isProduction,
    checks: { database: db, redis },
    timestamp: new Date().toISOString(),
  };
}

async function triggerBackup() {
  return backupService.runBackup();
}

async function getBackupHistory() {
  const backups = await prisma.systemBackup.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return backups.map((b) => ({
    ...b,
    fileSize: b.fileSize !== null && b.fileSize !== undefined ? Number(b.fileSize) : null,
  }));
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

module.exports = {
  getSystemStatus, getHealthCheck, triggerBackup, getBackupHistory,
};
