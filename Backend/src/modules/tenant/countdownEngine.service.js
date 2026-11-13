/**
 * GBS LOAN MANAGEMENT SYSTEM - SUBSCRIPTION COUNTDOWN ENGINE SERVICE
 * 90-Day Real-Time Countdown & Subscription Lifecycle Engine
 * Standard: Node.js CommonJS
 */

const { prisma } = require('../../config/database');
const logger = require('../../utils/logger');
const { NotFoundError } = require('../../utils/errors');

class CountdownEngineService {
  /**
   * Calculate real-time countdown details for a tenant
   */
  async getTenantCountdown(tenantId) {
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ id: tenantId }, { code: tenantId }],
      },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!tenant) {
      throw new NotFoundError(`Tenant '${tenantId}'`);
    }

    const now = new Date();
    const expiry = tenant.subExpiry ? new Date(tenant.subExpiry) : now;
    const diffMs = expiry.getTime() - now.getTime();

    const isExpired = diffMs <= 0;
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    let countdownPhase = 'NORMAL';
    if (isExpired) {
      countdownPhase = 'EXPIRED_LOCKOUT';
    } else if (days <= 7) {
      countdownPhase = 'CRITICAL';
    } else if (days <= 14) {
      countdownPhase = 'WARNING';
    }

    // Auto-update tenant record if status transitioned to expired
    if (isExpired && tenant.status === 'ACTIVE') {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: 'LOCKED_EXPIRED', daysLeft: 0 },
      }).catch((err) => {
        logger.warn(`Failed to auto-lock expired tenant ${tenant.id}: ${err.message}`);
      });
    }

    return {
      tenantId: tenant.id,
      tenantCode: tenant.code,
      tenantName: tenant.name,
      planTier: tenant.planTier,
      status: isExpired ? 'LOCKED_EXPIRED' : tenant.status,
      startDate: tenant.subStart,
      expiryDate: expiry,
      countdown: {
        totalSeconds,
        days,
        hours,
        minutes,
        seconds,
        formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`,
      },
      phase: countdownPhase,
      isLocked: isExpired || tenant.status === 'LOCKED_EXPIRED' || tenant.status === 'SUSPENDED',
      renewalPermittedBy: 'DEVELOPER_AUTHORITY_ONLY',
    };
  }

  /**
   * Run system-wide sweep across all tenants to evaluate countdowns and mark expired ones
   */
  async sweepAllTenants() {
    const now = new Date();
    const tenants = await prisma.tenant.findMany({
      where: {
        status: { in: ['ACTIVE', 'EXPIRING_SOON', 'LOCKED_EXPIRED'] },
      },
    });

    let activeCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let expiredCount = 0;

    for (const t of tenants) {
      if (!t.subExpiry) continue;
      const diffMs = new Date(t.subExpiry).getTime() - now.getTime();
      const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      if (diffMs <= 0) {
        expiredCount++;
        if (t.status !== 'LOCKED_EXPIRED') {
          await prisma.tenant.update({
            where: { id: t.id },
            data: { status: 'LOCKED_EXPIRED', daysLeft: 0 },
          });
          logger.warn(`[CountdownEngine] Locked expired tenant: ${t.name} (${t.code})`);
        }
      } else {
        let newStatus = t.status;
        if (daysLeft <= 7) {
          criticalCount++;
          newStatus = 'EXPIRING_SOON';
        } else if (daysLeft <= 14) {
          warningCount++;
          newStatus = 'EXPIRING_SOON';
        } else {
          activeCount++;
          newStatus = 'ACTIVE';
        }

        if (newStatus !== t.status || t.daysLeft !== daysLeft) {
          await prisma.tenant.update({
            where: { id: t.id },
            data: { status: newStatus, daysLeft },
          });
        }
      }
    }

    return {
      timestamp: now.toISOString(),
      totalTenantsSwept: tenants.length,
      activeCount,
      warningCount,
      criticalCount,
      expiredCount,
    };
  }
}

module.exports = new CountdownEngineService();
