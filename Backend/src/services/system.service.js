const os = require('os');
const { prisma } = require('../config/database');
const { checkDatabaseHealth } = require('../config/database');
const { checkRedisHealth } = require('../config/redis');
const backupService = require('./backup.service');
const config = require('../config');

async function getSystemStatus() {
  const [dbHealth, redisHealth, lastBackup] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
    prisma.systemBackup.findFirst({ orderBy: { createdAt: 'desc' } }),
  ]);

  return {
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
  const db = await checkDatabaseHealth();
  const redis = await checkRedisHealth();

  const healthy = db.connected && redis.connected;

  return {
    status: healthy ? 'healthy' : 'degraded',
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
