const { prisma } = require('../config/database');
const logger = require('../utils/logger');

const SKIP_PATHS = ['/health', '/metrics'];

function auditMiddleware(req, res, next) {
  if (SKIP_PATHS.some((p) => req.path.includes(p))) {
    return next();
  }

  const originalEnd = res.end;
  res.end = function (...args) {
    if (req.user && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      logAudit(req).catch((err) => logger.error('Audit log failed:', err));
    }
    return originalEnd.apply(res, args);
  };

  next();
}

async function logAudit(req) {
  const actionMap = {
    POST: 'CREATE',
    PUT: 'UPDATE',
    PATCH: 'UPDATE',
    DELETE: 'DELETE',
  };

  await prisma.auditLog.create({
    data: {
      userId: req.user?.isDeveloper ? null : req.user.id,
      action: actionMap[req.method] || 'READ',
      entityType: req.baseUrl.split('/').pop() || 'unknown',
      entityId: req.params.id || null,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        method: req.method,
        path: req.originalUrl,
        ...(req.user?.isDeveloper ? { developerUserId: req.user.id, developerEmail: req.user.email } : {}),
      },
    },
  });
}

module.exports = { auditMiddleware };
