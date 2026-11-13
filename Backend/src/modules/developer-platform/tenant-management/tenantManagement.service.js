const { prisma } = require('../../../config/database');
const tenantService = require('../../tenant/tenant.service');
const tenantProvisioner = require('../../tenant/tenantProvisioner.service');
const trialExpiration = require('../../tenant/trialExpiration.service');
const { NotFoundError, BadRequestError } = require('../../../utils/errors');

async function recordDeveloperTenantAudit(developerId, action, details = {}) {
  try {
    await prisma.developerAuditLog.create({
      data: {
        developerUserId: developerId || null,
        action,
        targetComponent: 'TENANT_MANAGEMENT',
        details,
      },
    });
  } catch {
    // Audit logging should not crash primary transaction post-commit
  }
}

class TenantManagementService {
  async getTenants(statusFilter = null) {
    const tenants = await prisma.tenant.findMany({
      where: statusFilter ? { onboardingStatus: statusFilter } : undefined,
      include: {
        branches: true,
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { users: true, members: true, loans: true, payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = Date.now();
    return tenants.map((t) => {
      const daysLeft = t.isLifetime
        ? 36500
        : t.subExpiry
          ? Math.max(0, Math.ceil((new Date(t.subExpiry).getTime() - now) / (1000 * 60 * 60 * 24)))
          : t.daysLeft;
      return {
        id: t.id,
        code: t.code,
        institutionId: t.institutionId,
        name: t.name,
        logoUrl: t.logoUrl || null,
        companyNameUpdated: Boolean(t.companyNameUpdated),
        institutionType: t.institutionType,
        status: t.status,
        onboardingStatus: t.onboardingStatus,
        planTier: t.planTier,
        subscriptionPlan: t.subscriptionPlan || 'TRIAL_1M',
        subscriptionMonths: t.subscriptionMonths,
        isLifetime: Boolean(t.isLifetime),
        currency: t.currency,
        region: t.region,
        city: t.city,
        location: t.location,
        latitude: t.latitude,
        longitude: t.longitude,
        contactEmail: t.contactEmail,
        contactPhone: t.contactPhone,
        representativeName: t.representativeName,
        representativeEmail: t.representativeEmail,
        registrationNumber: t.registrationNumber,
        daysLeft,
        subStart: t.subStart,
        subExpiry: t.subExpiry,
        activeMembers: t._count.members,
        totalUsers: t._count.users,
        totalLoans: t._count.loans,
        totalPayments: t._count.payments,
        branchesCount: t.branches.length,
        branches: t.branches,
        createdAt: t.createdAt,
      };
    });
  }

  async getPendingTenants() {
    return this.getTenants('PENDING');
  }

  async getTenantById(id) {
    const tenant = await prisma.tenant.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: {
        branches: true,
        locations: true,
        subscriptions: true,
        _count: { select: { users: true, members: true, loans: true, payments: true } },
      },
    });
    if (!tenant) throw new NotFoundError(`Tenant '${id}'`);
    return tenant;
  }

  async createTenant(data, developerId = null) {
    if (data.adminEmail) {
      return tenantProvisioner.provisionTenant({
        ...data,
        organizationName: data.organizationName || data.name,
        approvedByDeveloperId: developerId,
      });
    }
    return tenantService.createTenant(data);
  }

  async approveTenant(tenantId, developerId, options = {}) {
    const tenant = await tenantProvisioner.approvePendingTenant(tenantId, developerId, options);
    await recordDeveloperTenantAudit(developerId, 'TENANT_APPROVED', { tenantId: tenant.id, name: tenant.name });
    return tenant;
  }

  async rejectTenant(tenantId, developerId, reason) {
    const tenant = await tenantProvisioner.rejectPendingTenant(tenantId, developerId, reason);
    await recordDeveloperTenantAudit(developerId, 'TENANT_REJECTED', { tenantId: tenant.id, name: tenant.name, reason });
    return tenant;
  }

  async lockTenant(tenantId, reason, developerId = null) {
    const res = await trialExpiration.lockTenant(tenantId, reason);
    await recordDeveloperTenantAudit(developerId, 'TENANT_LOCKED', { tenantId, reason });
    return res;
  }

  async unlockTenant(tenantId, extensionDaysOrPlan = 30, note = 'Developer authorized unlock', developerId = null) {
    const res = await trialExpiration.unlockTenant(tenantId, extensionDaysOrPlan, note);
    await recordDeveloperTenantAudit(developerId, 'TENANT_UNLOCKED', { tenantId, planOrDays: extensionDaysOrPlan, note });
    return res;
  }

  async bulkLockTenants(tenantIds = [], reason = 'Bulk Developer Security Lock', developerId = null) {
    const uniqueIds = [...new Set((Array.isArray(tenantIds) ? tenantIds : []).filter(Boolean))];
    if (uniqueIds.length === 0) throw new BadRequestError('Select at least one tenant to lock');

    const results = [];
    const failures = [];
    for (const id of uniqueIds) {
      try {
        const res = await trialExpiration.lockTenant(id, reason);
        results.push({ id, name: res.tenant?.name, status: res.tenant?.status });
      } catch (err) {
        failures.push({ id, error: err.message });
      }
    }
    await recordDeveloperTenantAudit(developerId, 'TENANTS_BULK_LOCKED', { count: results.length, tenantIds: uniqueIds, reason });
    return {
      success: true,
      message: `Locked ${results.length} tenant(s)`,
      count: results.length,
      results,
      failures,
    };
  }

  async bulkUnlockTenants(tenantIds = [], extensionDays = 30, note = 'Bulk Developer Unlock', developerId = null) {
    const uniqueIds = [...new Set((Array.isArray(tenantIds) ? tenantIds : []).filter(Boolean))];
    if (uniqueIds.length === 0) throw new BadRequestError('Select at least one tenant to unlock');

    const results = [];
    const failures = [];
    for (const id of uniqueIds) {
      try {
        const res = await trialExpiration.unlockTenant(id, extensionDays, note);
        results.push({ id, name: res.tenant?.name, status: res.tenant?.status });
      } catch (err) {
        failures.push({ id, error: err.message });
      }
    }
    await recordDeveloperTenantAudit(developerId, 'TENANTS_BULK_UNLOCKED', { count: results.length, tenantIds: uniqueIds, extensionDays, note });
    return {
      success: true,
      message: `Unlocked ${results.length} tenant(s)`,
      count: results.length,
      results,
      failures,
    };
  }

  async deleteTenant(tenantId, developerId = null) {
    const tenant = await prisma.tenant.findFirst({
      where: { OR: [{ id: tenantId }, { code: tenantId }] },
    });
    if (!tenant) throw new NotFoundError(`Tenant '${tenantId}'`);

    const [loans, staff, collectors, users, guarantors] = await Promise.all([
      prisma.loan.findMany({ where: { tenantId: tenant.id }, select: { id: true } }),
      prisma.staff.findMany({ where: { tenantId: tenant.id }, select: { id: true } }),
      prisma.collector.findMany({ where: { tenantId: tenant.id }, select: { id: true } }),
      prisma.user.findMany({ where: { tenantId: tenant.id }, select: { id: true } }),
      prisma.guarantor.findMany({ where: { tenantId: tenant.id }, select: { id: true } }),
    ]);

    const loanIds = loans.map((l) => l.id);
    const staffIds = staff.map((s) => s.id);
    const collectorIds = collectors.map((c) => c.id);
    const userIds = users.map((u) => u.id);
    const guarantorIds = guarantors.map((g) => g.id);

    await prisma.$transaction(async (tx) => {
      if (loanIds.length > 0) {
        await tx.payment.deleteMany({ where: { loanId: { in: loanIds } } });
        await tx.loanGuarantor.deleteMany({ where: { loanId: { in: loanIds } } });
        await tx.collateralItem.deleteMany({ where: { loanId: { in: loanIds } } });
        await tx.loanWorkflowLog.deleteMany({ where: { loanId: { in: loanIds } } });
        await tx.repaymentSchedule.deleteMany({ where: { loanId: { in: loanIds } } });
        await tx.loanPenalty.deleteMany({ where: { loanId: { in: loanIds } } });
      }

      await tx.payment.deleteMany({ where: { tenantId: tenant.id } });
      await tx.loan.deleteMany({ where: { tenantId: tenant.id } });

      if (guarantorIds.length > 0) {
        await tx.loanGuarantor.deleteMany({ where: { guarantorId: { in: guarantorIds } } });
      }
      await tx.guarantor.deleteMany({ where: { tenantId: tenant.id } });
      await tx.member.deleteMany({ where: { tenantId: tenant.id } });

      if (collectorIds.length > 0) {
        await tx.customerVisit.deleteMany({ where: { collectorId: { in: collectorIds } } });
        await tx.collectorLocationLog.deleteMany({ where: { collectorId: { in: collectorIds } } });
      }
      await tx.customerVisit.deleteMany({ where: { tenantId: tenant.id } });
      await tx.collector.deleteMany({ where: { tenantId: tenant.id } });

      if (staffIds.length > 0) {
        await tx.staffSalary.deleteMany({ where: { staffId: { in: staffIds } } });
      }
      await tx.staffSalary.deleteMany({ where: { tenantId: tenant.id } });
      await tx.staff.deleteMany({ where: { tenantId: tenant.id } });

      await tx.notification.deleteMany({ where: { tenantId: tenant.id } });
      if (userIds.length > 0) {
        await tx.auditLog.deleteMany({
          where: { OR: [{ tenantId: tenant.id }, { userId: { in: userIds } }] },
        });
      } else {
        await tx.auditLog.deleteMany({ where: { tenantId: tenant.id } });
      }
      await tx.staffAttendance.deleteMany({ where: { tenantId: tenant.id } });
      await tx.cctvCamera.deleteMany({ where: { tenantId: tenant.id } });
      await tx.accountingAuditRecord.deleteMany({ where: { tenantId: tenant.id } });
      await tx.staffBroadcastMessage.deleteMany({ where: { tenantId: tenant.id } });

      await tx.user.deleteMany({ where: { tenantId: tenant.id } });

      await tx.zoomMeeting.deleteMany({ where: { tenantId: tenant.id } });
      await tx.reportSnapshot.deleteMany({ where: { tenantId: tenant.id } });
      await tx.documentRecord.deleteMany({ where: { tenantId: tenant.id } });
      await tx.loanProduct.deleteMany({ where: { tenantId: tenant.id } });
      await tx.complianceCase.deleteMany({ where: { tenantId: tenant.id } });
      await tx.supportTicket.deleteMany({ where: { tenantId: tenant.id } });
      await tx.investorAccount.deleteMany({ where: { tenantId: tenant.id } });
      await tx.marketingCampaign.deleteMany({ where: { tenantId: tenant.id } });
      await tx.deletionApprovalRequest.deleteMany({ where: { tenantId: tenant.id } });
      await tx.securityAlert.deleteMany({ where: { tenantId: tenant.id } });
      await tx.migrationJob.deleteMany({ where: { tenantId: tenant.id } });
      await tx.tenantMessage.deleteMany({ where: { tenantId: tenant.id } });
      await tx.tenantLocation.deleteMany({ where: { tenantId: tenant.id } });
      await tx.branch.deleteMany({ where: { tenantId: tenant.id } });
      await tx.tenantSubscription.deleteMany({ where: { tenantId: tenant.id } });

      await tx.tenant.delete({ where: { id: tenant.id } });
    });

    await recordDeveloperTenantAudit(developerId, 'TENANT_DELETED', {
      deletedTenantId: tenant.id,
      code: tenant.code,
      name: tenant.name,
    });

    return {
      success: true,
      message: `Tenant ${tenant.name} (${tenant.code}) permanently deleted`,
      deletedId: tenant.id,
      code: tenant.code,
    };
  }

  async renewTenant(tenantId, extensionDaysOrPlan = 30, note, developerId = null) {
    return this.unlockTenant(tenantId, extensionDaysOrPlan, note, developerId);
  }
}

module.exports = new TenantManagementService();
