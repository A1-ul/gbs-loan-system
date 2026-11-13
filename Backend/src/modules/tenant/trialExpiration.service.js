/**
 * GBS LOAN MANAGEMENT SYSTEM - TRIAL EXPIRATION & SYSTEM LOCKOUT SERVICE
 * Governs Subscription Lockouts, Remote Developer Lock/Unlock, and Emergency Overrides
 * Standard: Node.js CommonJS
 */

const { prisma } = require('../../config/database');
const logger = require('../../utils/logger');
const { AppError, NotFoundError } = require('../../utils/errors');

class TrialExpirationService {
  /**
   * Check if a tenant is currently locked out
   */
  async checkTenantLockout(tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        subExpiry: true,
        daysLeft: true,
      },
    });

    if (!tenant) return { isLocked: true, reason: 'TENANT_NOT_FOUND' };

    const now = new Date();
    const isExpired = tenant.subExpiry ? new Date(tenant.subExpiry).getTime() <= now.getTime() : false;
    const isManuallyLocked = tenant.status === 'LOCKED_EXPIRED' || tenant.status === 'SUSPENDED';

    return {
      tenantId: tenant.id,
      tenantCode: tenant.code,
      tenantName: tenant.name,
      isLocked: isExpired || isManuallyLocked,
      status: tenant.status,
      daysLeft: tenant.daysLeft,
      reason: isExpired ? 'SUBSCRIPTION_CYCLE_EXPIRED' : isManuallyLocked ? 'MANUAL_DEVELOPER_LOCK' : null,
      expiryDate: tenant.subExpiry,
    };
  }

  /**
   * Developer action: Unlock tenant and extend subscription by specified days
   */
  async unlockTenant(tenantId, extensionDays = 90, developerNote = 'Developer authorized extension') {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundError(`Tenant '${tenantId}'`);

    const now = new Date();
    const newExpiry = new Date(now.getTime() + extensionDays * 24 * 60 * 60 * 1000);

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        status: 'ACTIVE',
        subStart: now,
        subExpiry: newExpiry,
        daysLeft: extensionDays,
        alertSent: false,
      },
    });

    // Update active subscription
    await prisma.tenantSubscription.updateMany({
      where: { tenantId: tenant.id },
      data: {
        status: 'ACTIVE',
        endDate: newExpiry,
        lastPaymentAt: now,
      },
    });

    logger.info(`[TrialExpiration] Tenant unlocked: ${tenant.name} for ${extensionDays} days. Note: ${developerNote}`);

    return {
      success: true,
      message: `Tenant ${tenant.name} unlocked for ${extensionDays} days`,
      tenant: updated,
      newExpiryDate: newExpiry,
    };
  }

  /**
   * Developer action: Immediate emergency lockout
   */
  async lockTenant(tenantId, reason = 'Developer Security Intervention') {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundError(`Tenant '${tenantId}'`);

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        status: 'LOCKED_EXPIRED',
        daysLeft: 0,
      },
    });

    await prisma.tenantSubscription.updateMany({
      where: { tenantId: tenant.id },
      data: { status: 'LOCKED_EXPIRED' },
    });

    logger.warn(`[TrialExpiration] Tenant immediately locked: ${tenant.name}. Reason: ${reason}`);

    return {
      success: true,
      message: `Tenant ${tenant.name} locked out`,
      tenant: updated,
      reason,
    };
  }
}

module.exports = new TrialExpirationService();
