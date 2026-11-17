const os = require('os');
const { prisma, checkDatabaseHealth } = require('../../../config/database');
const { checkRedisHealth } = require('../../../config/redis');
const { getNotificationQueue } = require('../../../queues');
const { getSocketStats, emitToTenant, emitToDeveloper } = require('../../../config/socket');
const tenantGisService = require('../../tenant/tenantGis.service');
const { ValidationError } = require('../../../utils/errors');
const logger = require('../../../utils/logger');

/**
 * Live Developer Monitoring & Control Service (Zero Mocks, Strict Landlord Scope)
 */
async function getLiveMonitoringMetrics() {
  const demoTenant = await prisma.tenant.findUnique({
    where: { code: 'DEMO-SANDBOX' },
    select: { id: true },
  }).catch(() => null);
  const excludeDemoFilter = demoTenant
    ? { OR: [{ tenantId: null }, { tenantId: { not: demoTenant.id } }] }
    : {};

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
    prisma.tenant.count({ where: { code: { not: 'DEMO-SANDBOX' } } }).catch(() => 0),
    prisma.tenant.count({ where: { code: { not: 'DEMO-SANDBOX' }, onboardingStatus: 'PENDING' } }).catch(() => 0),
    prisma.tenant.count({ where: { code: { not: 'DEMO-SANDBOX' }, status: { in: ['ACTIVE', 'EXPIRING_SOON'] } } }).catch(() => 0),
    prisma.tenant.count({ where: { code: { not: 'DEMO-SANDBOX' }, status: 'LOCKED_EXPIRED' } }).catch(() => 0),
    prisma.user.count({ where: excludeDemoFilter }).catch(() => 0),
    prisma.member.count({ where: excludeDemoFilter }).catch(() => 0),
    prisma.loan.count({ where: excludeDemoFilter }).catch(() => 0),
    prisma.payment.count({ where: excludeDemoFilter }).catch(() => 0),
    prisma.collector.count({ where: { isActive: true, ...excludeDemoFilter } }).catch(() => 0),
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

async function sendTenantMessage({ tenantId = null, subject, title, body, priority = 'NORMAL', messageType, developerUser = null }) {
  const resolvedSubject = String(subject || title || 'System Authority Notice').trim();
  const resolvedBody = String(body || '').trim();
  if (!resolvedBody) {
    throw new ValidationError('Message body is required.');
  }
  const resolvedPriority = priority && priority !== 'NORMAL'
    ? priority
    : (messageType === 'URGENT_NOTICE' || messageType === 'CRITICAL' ? 'URGENT' : (priority || 'NORMAL'));

  const msg = await prisma.tenantMessage.create({
    data: {
      tenantId: tenantId || null,
      senderType: 'DEVELOPER',
      senderName: developerUser?.username || 'GBS Developer Control Authority',
      subject: resolvedSubject,
      body: resolvedBody,
      priority: resolvedPriority,
    },
  });

  if (tenantId) {
    emitToTenant(tenantId, 'tenant:developer_message', { ...msg, title: msg.subject });
  }
  await logDeveloperAction(developerUser?.id, 'SEND_TENANT_MESSAGE', tenantId ? `tenant:${tenantId}` : 'BROADCAST_ALL', {
    subject: resolvedSubject,
    priority: resolvedPriority,
  });
  return {
    ...msg,
    title: msg.subject,
    messageType: msg.priority,
  };
}

async function getTenantMessages(limit = 40) {
  const rows = await prisma.tenantMessage.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: { tenant: { select: { id: true, code: true, name: true } } },
  });
  return rows.map((m) => ({
    ...m,
    title: m.subject,
    messageType: m.priority,
  }));
}

async function runAiDiagnostics() {
  const { verifyBlueprintStructure, generateArchitectureReport } = require('../../ai-developer/assistant.service');
  const structure = await verifyBlueprintStructure();
  const report = await generateArchitectureReport();
  return { structure, report, timestamp: new Date().toISOString() };
}

async function getSystemUsers({ search = '', role = '', tenantId = '', status = '', page = 1, limit = 50 }) {
  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const where = {
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(tenantId ? { tenantId } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { username: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        email: true,
        username: true,
        phone: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        gpsAddress: true,
        lastLoginAt: true,
        dataSource: true,
        environmentTag: true,
        isProductionRecord: true,
        createdAt: true,
        tenant: {
          select: { id: true, name: true, code: true, institutionType: true },
        },
      },
    }),
  ]);

  return { total, page: Math.max(1, parseInt(page, 10)), limit: take, users };
}

async function getSystemUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      tenant: true,
      branch: true,
      verificationLogs: { take: 10, orderBy: { createdAt: 'desc' } },
      voiceProfile: true,
      memberProfile: { include: { loans: { take: 5, orderBy: { createdAt: 'desc' } } } },
      staffProfile: true,
      collectorProfile: true,
      guarantorProfile: true,
      _count: { select: { auditLogs: true, notifications: true } },
    },
  });
  if (!user) {
    throw new ValidationError(`User with ID '${id}' not found.`);
  }
  return user;
}

async function getAllSubscriptions({ status = '', page = 1, limit = 50 }) {
  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const where = status ? { status } : {};

  const [total, subscriptions] = await Promise.all([
    prisma.tenantSubscription.count({ where }),
    prisma.tenantSubscription.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: {
          select: { id: true, name: true, code: true, city: true, region: true, status: true, contactEmail: true },
        },
      },
    }),
  ]);

  const now = Date.now();
  const formatted = subscriptions.map((s) => {
    const daysLeft = s.isLifetime
      ? 36500
      : s.endDate
        ? Math.max(0, Math.ceil((new Date(s.endDate).getTime() - now) / (1000 * 60 * 60 * 24)))
        : 0;
    return {
      ...s,
      daysLeft,
    };
  });

  return { total, page: Math.max(1, parseInt(page, 10)), limit: take, subscriptions: formatted };
}

async function getSubscriptionById(id) {
  const sub = await prisma.tenantSubscription.findUnique({
    where: { id },
    include: {
      tenant: true,
    },
  });
  if (!sub) {
    throw new ValidationError(`Subscription with ID '${id}' not found.`);
  }
  const now = Date.now();
  const daysLeft = sub.isLifetime
    ? 36500
    : sub.endDate
      ? Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - now) / (1000 * 60 * 60 * 24)))
      : 0;
  return { ...sub, daysLeft };
}

async function getSystemActivities({ search = '', status = '', page = 1, limit = 50 }) {
  const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const take = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const where = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { action: { contains: search, mode: 'insensitive' } },
            { targetComponent: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, activities] = await Promise.all([
    prisma.developerAuditLog.count({ where }),
    prisma.developerAuditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        developerUser: { select: { id: true, username: true, email: true, accessLevel: true } },
      },
    }),
  ]);

  return { total, page: Math.max(1, parseInt(page, 10)), limit: take, activities };
}

async function getActivityById(id) {
  const activity = await prisma.developerAuditLog.findUnique({
    where: { id },
    include: {
      developerUser: { select: { id: true, username: true, email: true, accessLevel: true } },
    },
  });
  if (activity) return activity;

  // Fallback to tenant audit log
  const tenantAudit = await prisma.auditLog.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      tenant: { select: { id: true, name: true, code: true } },
    },
  });
  if (tenantAudit) return tenantAudit;

  throw new ValidationError(`Activity with ID '${id}' not found.`);
}

async function getSecurityAlertById(id) {
  const alert = await prisma.securityAlert.findUnique({
    where: { id },
    include: {
      tenant: { select: { id: true, name: true, code: true } },
    },
  });
  if (!alert) {
    throw new ValidationError(`Security Alert with ID '${id}' not found.`);
  }
  return alert;
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
  getSystemUsers,
  getSystemUserById,
  getAllSubscriptions,
  getSubscriptionById,
  getSystemActivities,
  getActivityById,
  getSecurityAlertById,
};
