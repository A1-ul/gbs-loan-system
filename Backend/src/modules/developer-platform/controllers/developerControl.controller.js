const os = require('os');
const developerControlService = require('../services/developerControl.service');
const developerAuthService = require('../services/developerAuth.service');
const feedbackService = require('../../../services/feedback.service');
const gpsService = require('../../../services/gps.service');
const { checkDatabaseHealth } = require('../../../config/database');
const { checkRedisHealth } = require('../../../config/redis');
const { getSocketStats } = require('../../../config/socket');
const logger = require('../../../utils/logger');

async function login(req, res, next) {
  try {
    const result = await developerAuthService.developerLogin(req.body, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceFingerprint: req.headers['x-device-fingerprint'] || req.body?.deviceFingerprint,
    });
    return res.status(200).json({ success: true, message: 'Developer Landlord authenticated', data: result });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    await developerAuthService.developerLogout(req.developer.id, req.ip);
    return res.status(200).json({ success: true, message: 'Developer session terminated' });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const dev = await developerAuthService.getDeveloperProfile(req.developer.id);
    return res.status(200).json({ success: true, data: dev });
  } catch (error) {
    next(error);
  }
}

async function getDashboard(req, res, next) {
  try {
    const metrics = await developerControlService.getLiveMonitoringMetrics();
    return res.status(200).json({
      success: true,
      message: 'Developer Control Center Dashboard metrics fetched',
      data: metrics,
    });
  } catch (error) {
    logger.error('Developer control dashboard error:', error);
    next(error);
  }
}

async function getPerformance(req, res, next) {
  try {
    const memory = process.memoryUsage();
    const t0 = Date.now();
    const db = await checkDatabaseHealth();
    const dbPingMs = Date.now() - t0;
    const r0 = Date.now();
    const redis = await checkRedisHealth();
    const redisPingMs = Date.now() - r0;
    const sockets = getSocketStats();

    return res.status(200).json({
      success: true,
      data: {
        uptimeSeconds: Math.round(process.uptime()),
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
        osFreeMemMb: Math.round(os.freemem() / 1024 / 1024),
        cpuLoad1m: Number((os.loadavg()[0] || 0).toFixed(2)),
        cpuCores: os.cpus().length,
        activeConnections: sockets.activeConnections,
        dbLatencyMs: dbPingMs,
        dbConnected: db.connected,
        redisLatencyMs: redisPingMs,
        redisConnected: redis.connected,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function lockSystem(req, res, next) {
  try {
    const { isLocked, maintenanceMode, lockReason } = req.body;
    const lockState = await developerControlService.toggleSystemLock(
      isLocked,
      maintenanceMode,
      lockReason,
      req.developer?.id || null,
      req.ip
    );
    return res.status(200).json({
      success: true,
      message: `System lock state updated to ${isLocked ? 'LOCKED' : 'UNLOCKED'}`,
      data: lockState,
    });
  } catch (error) {
    next(error);
  }
}

async function getLocations(req, res, next) {
  try {
    const locations = await developerControlService.getTenantLocations();
    return res.status(200).json({ success: true, data: locations });
  } catch (error) {
    next(error);
  }
}

async function lookupLocationByPhone(req, res, next) {
  try {
    const phone = req.query.phone || '';
    const data = await gpsService.locateByPhone({ phone, allowCrossTenant: true });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

async function checkSubscriptions(req, res, next) {
  try {
    const summary = await developerControlService.inspectSubscriptions();
    return res.status(200).json({ success: true, message: 'Subscription audit completed', data: summary });
  } catch (error) {
    next(error);
  }
}

async function getLogs(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = await developerControlService.getDeveloperLogs(limit);
    return res.status(200).json({
      success: true,
      logs: logs.map((l) => ({
        id: l.id,
        type: l.action,
        msg: `${l.action} on ${l.targetComponent} by ${l.developerUser?.username || 'SYSTEM'} [${l.status}]`,
        time: l.createdAt,
        details: l.details,
      })),
    });
  } catch (error) {
    next(error);
  }
}

async function getLockState(req, res, next) {
  try {
    const state = await developerControlService.getSystemLockState();
    return res.status(200).json({ success: true, data: state });
  } catch (error) {
    next(error);
  }
}

async function runDiagnostics(req, res, next) {
  try {
    const diagnostics = await developerControlService.runAiDiagnostics();
    return res.status(200).json({ success: true, data: diagnostics });
  } catch (error) {
    next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const msg = await developerControlService.sendTenantMessage({
      ...req.body,
      developerUser: req.developer,
    });
    return res.status(201).json({ success: true, message: 'Message dispatched to tenant(s)', data: msg });
  } catch (error) {
    next(error);
  }
}

async function getMessages(req, res, next) {
  try {
    const msgs = await developerControlService.getTenantMessages(parseInt(req.query.limit, 10) || 40);
    return res.status(200).json({ success: true, data: msgs });
  } catch (error) {
    next(error);
  }
}

async function getFeedbacks(req, res, next) {
  try {
    const result = await feedbackService.getFeedbacks(req.query, req.developer, true);
    return res.status(200).json({ success: true, data: result.data, total: result.total, pagination: { page: result.page, limit: result.limit, totalPages: result.totalPages } });
  } catch (error) {
    next(error);
  }
}

async function respondFeedback(req, res, next) {
  try {
    const updated = await feedbackService.respondToFeedback(req.params.id, req.body, req.developer, true);
    return res.status(200).json({ success: true, message: 'Developer response submitted', data: updated });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  logout,
  getMe,
  getDashboard,
  getPerformance,
  lockSystem,
  getLocations,
  lookupLocationByPhone,
  checkSubscriptions,
  getLogs,
  getLockState,
  runDiagnostics,
  sendMessage,
  getMessages,
  getFeedbacks,
  respondFeedback,
};
