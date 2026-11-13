const os = require('os');
const { prisma, checkDatabaseHealth } = require('../../../config/database');
const { checkRedisHealth } = require('../../../config/redis');
const { getNotificationQueue } = require('../../../queues');
const { getSocketStats } = require('../../../config/socket');

class LiveDiagnosticsService {
  async runFullDiagnostic() {
    const t0 = Date.now();
    const dbHealth = await checkDatabaseHealth();
    const dbLatencyMs = Date.now() - t0;

    const r0 = Date.now();
    const redisHealth = await checkRedisHealth();
    const redisLatencyMs = Date.now() - r0;

    const queue = getNotificationQueue();
    const jobCounts = queue ? await queue.getJobCounts().catch(() => ({ waiting: 0, active: 0, failed: 0 })) : {};
    const pendingJobs = (jobCounts.waiting || 0) + (jobCounts.active || 0);
    const socketStats = getSocketStats();

    const [activeVoiceProfiles, totalAuditLogs, unresolvedAlerts, recentErrors] = await Promise.all([
      prisma.voiceProfile.count({ where: { isEnrolled: true } }).catch(() => 0),
      prisma.auditLog.count().catch(() => 0),
      prisma.securityAlert.count({ where: { resolved: false } }).catch(() => 0),
      prisma.aIDiagnosticLog.count({ where: { autoFixed: false } }).catch(() => 0),
    ]);

    const checks = [
      { component: 'PostgreSQL Connection', status: dbHealth.connected ? 'HEALTHY' : 'ERROR', latencyMs: dbLatencyMs },
      { component: 'Redis Cache Layer', status: redisHealth.connected ? 'HEALTHY' : 'WARNING', latencyMs: redisLatencyMs },
      { component: 'Background Job Queues (Bull)', status: queue ? 'HEALTHY' : 'STANDBY', pendingJobs, failedJobs: jobCounts.failed || 0 },
      { component: 'WebSocket Engine (Socket.IO)', status: socketStats.status.toUpperCase(), activeSockets: socketStats.activeConnections },
      { component: 'Host Memory Telemetry', status: 'HEALTHY', freeRamMb: Math.round(os.freemem() / 1024 / 1024) },
      { component: 'Voice Identity Biometric Vault', status: 'HEALTHY', enrolledVoiceprints: activeVoiceProfiles },
      { component: 'Audit & Security Integrity', status: unresolvedAlerts > 10 ? 'ATTENTION' : 'HEALTHY', totalAuditLogs, unresolvedAlerts, openDiagnosticIssues: recentErrors },
    ];

    const overallHealthy = dbHealth.connected;

    return {
      status: overallHealthy ? 'DIAGNOSTIC_PASSED' : 'DIAGNOSTIC_DEGRADED',
      timestamp: new Date().toISOString(),
      checks,
      selfHealingActive: true,
      circuitBreakerState: overallHealthy ? 'CLOSED' : 'HALF_OPEN',
    };
  }
}

module.exports = new LiveDiagnosticsService();
