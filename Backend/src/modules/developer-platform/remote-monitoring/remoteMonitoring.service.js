const os = require('os');
const { prisma, checkDatabaseHealth } = require('../../../config/database');
const { checkRedisHealth } = require('../../../config/redis');
const { getNotificationQueue } = require('../../../queues');
const { getSocketStats } = require('../../../config/socket');

class RemoteMonitoringService {
  async getSystemMetrics() {
    const memory = process.memoryUsage();
    const t0 = Date.now();
    const dbHealth = await checkDatabaseHealth();
    const dbLatencyMs = Date.now() - t0;

    const r0 = Date.now();
    const redisHealth = await checkRedisHealth();
    const redisLatencyMs = Date.now() - r0;

    const queue = getNotificationQueue();
    const jobCounts = queue ? await queue.getJobCounts().catch(() => ({})) : {};
    const socketStats = getSocketStats();
    const loadAvg = os.loadavg();
    const cpuUsage = process.cpuUsage();

    return {
      status: dbHealth.connected ? 'HEALTHY' : 'DEGRADED',
      uptime: Math.round(process.uptime()),
      loadAvg: loadAvg.map((v) => Number(v.toFixed(2))),
      cpuUsage: {
        userMs: Math.round(cpuUsage.user / 1000),
        systemMs: Math.round(cpuUsage.system / 1000),
        cpuCores: os.cpus().length,
      },
      memory: {
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
        osFreeMb: Math.round(os.freemem() / 1024 / 1024),
        osTotalMb: Math.round(os.totalmem() / 1024 / 1024),
      },
      activeSockets: socketStats.activeConnections,
      databaseLatencyMs: dbLatencyMs,
      databaseConnected: dbHealth.connected,
      redisLatencyMs,
      redisConnected: redisHealth.connected,
      queues: jobCounts,
      timestamp: new Date().toISOString(),
    };
  }

  async getHeartbeat() {
    const [db, redis, pendingTenants] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
      prisma.tenant.count({ where: { onboardingStatus: 'PENDING' } }).catch(() => 0),
    ]);
    return {
      service: 'gbs-loan-system',
      heartbeat: db.connected ? 'PULSE_OK' : 'DEGRADED',
      database: db.connected,
      redis: redis.connected,
      pendingTenantApprovals: pendingTenants,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new RemoteMonitoringService();
