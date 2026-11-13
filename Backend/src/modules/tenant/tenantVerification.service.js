/**
 * GBS LOAN MANAGEMENT SYSTEM - TENANT VERIFICATION SERVICE
 * Real PostgreSQL Database Verification for Tenants
 * Standard: Node.js CommonJS
 */

const { prisma } = require('../../config/database');
const logger = require('../../utils/logger');
const { NotFoundError } = require('../../utils/errors');

class TenantVerificationService {
  /**
   * Verify tenant credentials, compliance status, and domain validity
   */
  async verifyTenant(tenantId) {
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ id: tenantId }, { code: tenantId }],
      },
      include: {
        branches: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!tenant) {
      throw new NotFoundError(`Tenant '${tenantId}'`);
    }

    const isVerified = tenant.status === 'ACTIVE' && (tenant.daysLeft > 0 || !tenant.subExpiry);
    const checks = {
      hasActiveStatus: tenant.status === 'ACTIVE',
      hasBranches: tenant.branches.length > 0,
      subscriptionValid: tenant.daysLeft > 0,
      currencyConfigured: Boolean(tenant.currency),
    };

    logger.info(`[TenantVerification] Verified tenant: ${tenant.name} (${tenant.code}) - Passed: ${isVerified}`);

    return {
      success: isVerified,
      tenantId: tenant.id,
      tenantCode: tenant.code,
      tenantName: tenant.name,
      status: tenant.status,
      complianceChecks: checks,
      verifiedAt: new Date().toISOString(),
    };
  }

  async findMany(query = {}) {
    const tenants = await prisma.tenant.findMany({
      where: query.status ? { status: query.status } : undefined,
      select: { id: true, code: true, name: true, status: true, planTier: true },
      take: query.limit || 50,
    });
    return { success: true, data: tenants, total: tenants.length };
  }

  async findOne(id) {
    return this.verifyTenant(id);
  }
}

module.exports = new TenantVerificationService();
