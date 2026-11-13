const { prisma } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Multi-Tenant Isolation Middleware
 * Non-developer authenticated users are strictly bound to their own req.user.tenantId.
 * Cross-tenant access via header spoofing is blocked.
 */
async function tenantIsolation(req, res, next) {
  try {
    const isDeveloper = Boolean(req.developer || req.user?.isDeveloper);
    const tenantIdentifier = isDeveloper
      ? (req.headers['x-tenant-id'] || req.query.tenantId || null)
      : (req.user?.tenantId || null);

    if (!isDeveloper && req.headers['x-tenant-id'] && req.user?.tenantId && req.headers['x-tenant-id'] !== req.user.tenantId) {
      return res.status(403).json({
        success: false,
        code: 'TENANT_ISOLATION_VIOLATION',
        message: 'Cross-tenant header access denied.',
      });
    }

    if (!tenantIdentifier) {
      req.tenant = req.tenant || null;
      return next();
    }

    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ id: tenantIdentifier }, { code: tenantIdentifier }],
      },
      include: {
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: `Tenant organization '${tenantIdentifier}' not found`,
        code: 'TENANT_NOT_FOUND',
      });
    }

    if (!isDeveloper && (tenant.status === 'LOCKED_EXPIRED' || tenant.status === 'SUSPENDED')) {
      return res.status(403).json({
        success: false,
        message: `Access denied: Tenant '${tenant.name}' is ${tenant.status}.`,
        code: 'TENANT_LOCKED',
        data: { tenantId: tenant.id, status: tenant.status, daysLeft: tenant.daysLeft },
      });
    }

    req.tenant = tenant;
    req.tenantId = tenant.id;
    return next();
  } catch (err) {
    logger.error('Tenant isolation middleware error:', err);
    return next(err);
  }
}

function requireActiveTenant(req, res, next) {
  if (!req.tenantId && !req.tenant) {
    return res.status(400).json({
      success: false,
      message: 'Active tenant context required.',
      code: 'MISSING_TENANT_CONTEXT',
    });
  }
  return next();
}

module.exports = {
  tenantIsolation,
  requireActiveTenant,
};
