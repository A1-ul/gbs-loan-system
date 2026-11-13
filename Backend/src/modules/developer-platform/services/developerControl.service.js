const os = require('os');
const { prisma, checkDatabaseHealth } = require('../../../config/database');
const { checkRedisHealth } = require('../../../config/redis');
const { getNotificationQueue } = require('../../../queues');
const { getSocketStats, emitToTenant, emitToDeveloper } = require('../../../config/socket');
const tenantGisService = require('../../tenant/tenantGis.service');
const logger = require('../../../utils/logger');

/**
 * Live Developer Monitoring & Control Service (Zero Mocks, Strict Landlord Scope)
 */
async function getLiveMonitoringMetrics() {
  const [
    dbHealth,
    redisHealth,
    totalTenants,
    pendingTenants,
    activeTenants,
    lockedTenants,
    userCount,
    memberCount,
    loanCount,
    paymentCount,
    collectorCount,
    lockState,
    openAlertsCount,
    openCrashCount,
  ] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
    prisma.tenant.count().catch(() => 0),
    prisma.tenant.count({ where: { onboardingStatus: 'PENDING' } }).catch(() => 0),
    prisma.tenant.count({ where: { status: { in: ['ACTIVE', 'EXPIRING_SOON'] } } }).catch(() => 0),
    prisma.tenant.count({ where: { status: 'LOCKED_EXPIRED' } }).catch(() => 0),
    prisma.user.count().catch(() => 0),
    prisma.member.count().catch(() => 0),
    prisma.loan.count().catch(() => 0),
    prisma.payment.count().catch(() => 0),
    prisma.collector.count({ where: { isActive: true } }).catch(() => 0),
    prisma.systemLockState.findFirst({ orderBy: { updatedAt: 'desc' } }).catch(() => null),
    prisma.securityAlert.count({ where: { resolved: false } }).catch(() => 0),
    prisma.aIDiagnosticLog.count({ where: { autoFixed: false } }).catch(() => 0),
  ]);

  const queue = getNotificationQueue();
  const jobCounts = queue ? await queue.getJobCounts().catch(() => ({})) : {};
  const pendingJobs = (jobCounts.waiting || 0) + (jobCounts.active || 0);
  const socketStats = getSocketStats();
  const memoryUsage = process.memoryUsage();

  return {
    timestamp: new Date().toISOString(),
    system: {
      uptimeSeconds: Math.floor(process.uptime()),
      cpuLoad: os.loadavg().map((n) => Number(n.toFixed(2))),
      memory: {
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        systemFreeMb: Math.round(os.freemem() / 1024 / 1024),
        systemTotalMb: Math.round(os.totalmem() / 1024 / 1024),
      },
    },
    services: {
      database: dbHealth,
      redis: redisHealth,
      queues: { status: queue ? 'active' : 'standby', pendingJobs, ...jobCounts },
      socketIo: socketStats,
    },
    counts: {
      totalTenants,
      pendingTenants,
      activeTenants,
      lockedTenants,
      totalUsers: userCount,
      totalMembers: memberCount,
      totalLoans: loanCount,
      totalPayments: paymentCount,
      activeCollectors: collectorCount,
      openSecurityAlerts: openAlertsCount,
      openDiagnostics: openCrashCount,
    },
    systemLock: {
      isLocked: lockState ? lockState.isLocked : false,
      maintenanceMode: lockState ? lockState.maintenanceMode : false,
      reason: lockState ? lockState.lockReason : null,
    },
  };
}

async function resolveDeveloperUserId(developerUserId) {
  if (!developerUserId) return null;
  const devUser = await prisma.developerUser.findUnique({ where: { id: developerUserId } });
  return devUser ? devUser.id : null;
}

async function toggleSystemLock(isLocked, maintenanceMode, lockReason, developerUserId, ipAddress) {
  const resolvedDevId = await resolveDeveloperUserId(developerUserId);
  let lockState = await prisma.systemLockState.findFirst();

  const payload = {
    isLocked: Boolean(isLocked),
    maintenanceMode: Boolean(maintenanceMode),
    lockReason: isLocked ? (lockReason || 'Maintenance Lockdown by Lead Developer') : null,
    lockedBy: resolvedDevId || developerUserId || 'Developer',
    lockedAt: isLocked ? new Date() : null,
  };

  lockState = lockState
    ? await prisma.systemLockState.update({ where: { id: lockState.id }, data: payload })
    : await prisma.systemLockState.create({ data: payload });

  await prisma.developerAuditLog.create({
    data: {
      developerUserId: resolvedDevId,
      action: isLocked ? 'LOCK_SYSTEM' : 'UNLOCK_SYSTEM',
      targetComponent: 'SYSTEM_LOCK_STATE',
      details: { isLocked, maintenanceMode, lockReason },
      ipAddress,
    },
  });

  emitToDeveloper('system:lock_changed', { isLocked: payload.isLocked, reason: payload.lockReason });
  logger.warn(`Developer system lock status updated: Locked=${isLocked}`);
  return lockState;
}

async function getSystemLockState() {
  const lockState = await prisma.systemLockState.findFirst({ orderBy: { updatedAt: 'desc' } });
  return {
    isLocked: lockState ? lockState.isLocked : false,
    maintenanceMode: lockState ? lockState.maintenanceMode : false,
    lockReason: lockState ? lockState.lockReason : null,
    lockedBy: lockState ? lockState.lockedBy : null,
    lockedAt: lockState ? lockState.lockedAt : null,
  };
}

async function getTenantLocations() {
  return tenantGisService.getAllTenantGisLocations();
}

async function inspectSubscriptions() {
  const now = new Date();
  const subscriptions = await prisma.tenantSubscription.findMany({
    include: { tenant: { select: { code: true, name: true, status: true, daysLeft: true } } },
  });

  const statusSummary = { total: subscriptions.length, active: 0, expired: 0, gracePeriod: 0, suspended: 0 };
  for (const sub of subscriptions) {
    if (sub.endDate < now) {
      const graceEnd = new Date(sub.endDate.getTime() + sub.gracePeriodDays * 86400000);
      if (now > graceEnd) {
        await prisma.tenantSubscription.update({ where: { id: sub.id }, data: { status: 'EXPIRED' } });
        statusSummary.expired++;
      } else {
        await prisma.tenantSubscription.update({ where: { id: sub.id }, data: { status: 'GRACE_PERIOD' } });
        statusSummary.gracePeriod++;
      }
    } else {
      statusSummary.active++;
    }
  }
  return { ...statusSummary, subscriptions };
}

async function logDeveloperAction(developerUserId, action, targetComponent, details, ipAddress) {
  const resolvedDevId = await resolveDeveloperUserId(developerUserId);
  return prisma.developerAuditLog.create({
    data: { developerUserId: resolvedDevId, action, targetComponent, details, ipAddress },
  });
}

async function getDeveloperLogs(limit = 50) {
  return prisma.developerAuditLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      developerUser: {
        select: { id: true, username: true, email: true, accessLevel: true },
      },
    },
  });
}

async function sendTenantMessage({ tenantId = null, subject, body, priority = 'NORMAL', developerUser = null }) {
  const msg = await prisma.tenantMessage.create({
    data: {
      tenantId: tenantId || null,
      senderType: 'DEVELOPER',
      senderName: developerUser?.username || 'GBS Developer Control Authority',
      subject,
      body,
      priority,
    },
  });

  if (tenantId) {
    emitToTenant(tenantId, 'tenant:developer_message', msg);
  }
  await logDeveloperAction(developerUser?.id, 'SEND_TENANT_MESSAGE', tenantId ? `tenant:${tenantId}` : 'BROADCAST_ALL', { subject, priority });
  return msg;
}

async function getTenantMessages(limit = 40) {
  return prisma.tenantMessage.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { tenant: { select: { id: true, code: true, name: true } } },
  });
}

async function runAiDiagnostics() {
  const { verifyBlueprintStructure, generateArchitectureReport } = require('../../ai-developer/assistant.service');
  const structure = await verifyBlueprintStructure();
  const report = await generateArchitectureReport();
  return { structure, report, timestamp: new Date().toISOString() };
}

module.exports = {
  getLiveMonitoringMetrics,
  toggleSystemLock,
  getSystemLockState,
  getTenantLocations,
  inspectSubscriptions,
  logDeveloperAction,
  getDeveloperLogs,
  sendTenantMessage,
  getTenantMessages,
  runAiDiagnostics,
};
