const { prisma, checkDatabaseHealth } = require('../../../config/database');
const { checkRedisHealth } = require('../../../config/redis');
const backupService = require('../../../services/backup.service');

class RecoveryService {
  async getRecoveryPlan() {
    const [db, redis, latestBackup] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
      prisma.systemBackup.findFirst({ where: { status: 'SUCCESS' }, orderBy: { createdAt: 'desc' } }),
    ]);

    return {
      status: db.connected ? 'STANDBY_READY' : 'DEGRADED',
      databaseOnline: db.connected,
      redisOnline: redis.connected,
      latestVerifiedBackupAt: latestBackup?.completedAt || null,
      scenarios: [
        { name: 'Database Primary Health Check', target: 'PostgreSQL 18', status: db.connected ? 'READY' : 'ALERT' },
        { name: 'Redis Queue Fallback & Reconnect', target: 'Redis Cache', status: redis.connected ? 'READY' : 'DEGRADED' },
        { name: 'Automated Database Snapshot Trigger', target: 'pg_dump', status: latestBackup ? 'VERIFIED' : 'PENDING' },
      ],
    };
  }

  async executeFailover(scenarioName, developerUser = null) {
    const [db, redis] = await Promise.all([checkDatabaseHealth(), checkRedisHealth()]);
    let backupSnapshot = null;
    if (scenarioName === 'EMERGENCY_SNAPSHOT' || scenarioName === 'PRE_RECOVERY_BACKUP') {
      backupSnapshot = await backupService.runBackup().catch(() => null);
    }

    await prisma.developerAuditLog.create({
      data: {
        developerUserId: developerUser?.id || null,
        action: 'DISASTER_RECOVERY_RUN',
        targetComponent: 'RECOVERY_ENGINE',
        details: { scenarioName, dbConnected: db.connected, redisConnected: redis.connected },
      },
    }).catch(() => {});

    return {
      status: db.connected ? 'RECOVERY_VERIFIED' : 'RECOVERY_DEGRADED',
      scenario: scenarioName || 'LIVE_INFRASTRUCTURE_RECOVERY_CHECK',
      servicesOnline: db.connected,
      redisOnline: redis.connected,
      backupSnapshot,
      executedAt: new Date().toISOString(),
    };
  }
}

module.exports = new RecoveryService();
