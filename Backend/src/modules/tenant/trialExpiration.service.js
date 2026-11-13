/**
 * GBS LOAN MANAGEMENT SYSTEM - TRIAL EXPIRATION & SYSTEM LOCKOUT SERVICE
 * Governs Subscription Lockouts, Remote Developer Lock/Unlock, and Emergency Overrides
 * Standard: Node.js CommonJS
 */

const { prisma } = require('../../config/database');
const logger = require('../../utils/logger');
const { AppError, NotFoundError } = require('../../utils/errors');
const { resolveSubscriptionPlan } = require('./subscriptionPlans');

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
        isLifetime: true,
        subscriptionPlan: true,
        subExpiry: true,
        daysLeft: true,
      },
    });

    if (!tenant) return { isLocked: true, reason: 'TENANT_NOT_FOUND' };

    const now = new Date();
    const isExpired = !tenant.isLifetime && tenant.subExpiry ? new Date(tenant.subExpiry).getTime() <= now.getTime() : false;
    const isManuallyLocked = tenant.status === 'LOCKED_EXPIRED' || tenant.status === 'SUSPENDED';

    return {
      tenantId: tenant.id,
      tenantCode: tenant.code,
      tenantName: tenant.name,
      isLocked: isExpired || isManuallyLocked,
      isLifetime: Boolean(tenant.isLifetime),
      subscriptionPlan: tenant.subscriptionPlan || 'TRIAL_1M',
      status: tenant.status,
      daysLeft: tenant.isLifetime ? 36500 : tenant.daysLeft,
      reason: isExpired ? 'SUBSCRIPTION_CYCLE_EXPIRED' : isManuallyLocked ? 'MANUAL_DEVELOPER_LOCK' : null,
      expiryDate: tenant.subExpiry,
    };
  }

  /**
   * Developer action: Unlock tenant and extend subscription by plan code or days
   */
  async unlockTenant(tenantId, extensionDaysOrPlan = 30, developerNote = 'Developer authorized extension') {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundError(`Tenant '${tenantId}'`);

    const now = new Date();
    const plan = resolveSubscriptionPlan(extensionDaysOrPlan, 30);
    const newExpiry = plan.subExpiry;

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        status: 'ACTIVE',
        onboardingStatus: plan.code === 'TRIAL_1M' ? (tenant.onboardingStatus === 'ACTIVE_PAID' ? 'ACTIVE_PAID' : 'ACTIVE_TRIAL') : 'ACTIVE_PAID',
        subscriptionPlan: plan.code,
        subscriptionMonths: plan.months,
        isLifetime: plan.isLifetime,
        subStart: now,
        subExpiry: newExpiry,
        daysLeft: plan.days,
        alertSent: false,
      },
    });

    await prisma.tenantSubscription.updateMany({
      where: { tenantId: tenant.id },
      data: {
        status: 'ACTIVE',
        planName: plan.label,
        endDate: newExpiry || new Date(now.getTime() + 36500 * 24 * 60 * 60 * 1000),
        lastPaymentAt: now,
      },
    });

    logger.info(`[TrialExpiration] Tenant unlocked: ${tenant.name} (${plan.label}). Note: ${developerNote}`);

    return {
      success: true,
      message: plan.isLifetime
        ? `Tenant ${tenant.name} unlocked with Lifetime License`
        : `Tenant ${tenant.name} unlocked for ${plan.days} days (${plan.label})`,
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
        onboardingStatus: 'LOCKED',
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
