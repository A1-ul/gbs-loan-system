/**
 * GBS LOAN MANAGEMENT SYSTEM - TENANT AUDIT SERVICE
 * Real Immutable Audit Trail Queries for Tenants
 * Standard: Node.js CommonJS
 */

const { prisma } = require('../../config/database');
const logger = require('../../utils/logger');

class TenantAuditService {
  /**
   * Fetch tenant audit logs from PostgreSQL
   */
  async getTenantAuditLogs(tenantId, options = {}) {
    const { limit = 50, page = 1, action, entity } = options;
    const skip = (page - 1) * limit;

    const where = {
      tenantId,
      ...(action ? { action } : {}),
      ...(entity ? { entity } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, role: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      success: true,
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async logTenantAction(tenantId, userId, action, entity, entityId, details = {}) {
    return prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action,
        entity,
        entityId: entityId ? String(entityId) : null,
        details,
      },
    });
  }
}

module.exports = new TenantAuditService();
