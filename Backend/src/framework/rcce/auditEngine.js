/**
 * GBS Central System Response, Control and Communication Engine (GBS-RCCE)
 * Activity Tracking & Audit Engine
 * Standard: Node.js CommonJS
 */

const { prisma } = require('../../config/database');
const { getRecordProvenance } = require('../../config/environments');
const logger = require('../../utils/logger');

class AuditEngine {
  /**
   * Log an audit trail entry
   */
  async logActivity({
    req = null,
    userId = null,
    role = null,
    tenantId = null,
    action,
    entityType = 'SYSTEM',
    entityId = null,
    status = 'SUCCESS',
    details = {},
    isDeveloper = false,
  }) {
    const actorUserId = userId || req?.user?.id || req?.developer?.id || null;
    const actorRole = role || req?.user?.role || (req?.developer ? 'LEAD_DEVELOPER' : 'SYSTEM');
    const actorTenantId = tenantId || req?.user?.tenantId || null;
    const ipAddress = req?.ip || req?.headers['x-forwarded-for'] || '127.0.0.1';
    const userAgent = req?.headers['user-agent'] || 'API_CLIENT';
    const requestId = req?.id || req?.headers['x-request-id'] || 'req_auto';
    const provenance = getRecordProvenance();

    const auditPayload = {
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      status,
      details: {
        ...details,
        requestId,
        ipAddress,
        userAgent,
      },
    };

    try {
      if (isDeveloper || req?.developer) {
        await prisma.developerAuditLog.create({
          data: {
            developerUserId: req?.developer?.id || null,
            action,
            targetComponent: entityType,
            details: auditPayload.details,
            status,
          },
        });
      } else {
        await prisma.auditLog.create({
          data: {
            tenantId: actorTenantId,
            userId: actorUserId,
            action,
            entityType,
            entityId: auditPayload.entityId,
            details: auditPayload.details,
            ipAddress,
            userAgent,
            dataSource: provenance.dataSource,
            environmentTag: provenance.environmentTag,
            isProductionRecord: provenance.isProductionRecord,
          },
        });
      }
    } catch (err) {
      logger.warn(`AuditLog creation skipped on error: ${err.message}`);
    }
  }

  /**
   * Retrieve audit logs with filters
   */
  async getAuditTrail({ tenantId = null, limit = 50, page = 1, action = null }) {
    const skip = (page - 1) * limit;
    const where = {
      ...(tenantId ? { tenantId } : {}),
      ...(action ? { action } : {}),
    };

    const [total, records] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          tenant: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
    ]);

    return { total, page, limit, records };
  }
}

module.exports = new AuditEngine();
