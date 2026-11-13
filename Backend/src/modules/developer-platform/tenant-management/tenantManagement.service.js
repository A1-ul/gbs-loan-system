const { prisma } = require('../../../config/database');
const tenantService = require('../../tenant/tenant.service');
const tenantProvisioner = require('../../tenant/tenantProvisioner.service');
const trialExpiration = require('../../tenant/trialExpiration.service');
const { NotFoundError } = require('../../../utils/errors');

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
      const daysLeft = t.subExpiry
        ? Math.max(0, Math.ceil((new Date(t.subExpiry).getTime() - now) / (1000 * 60 * 60 * 24)))
        : t.daysLeft;
      return {
        id: t.id,
        code: t.code,
        institutionId: t.institutionId,
        name: t.name,
        institutionType: t.institutionType,
        status: t.status,
        onboardingStatus: t.onboardingStatus,
        planTier: t.planTier,
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
    return tenantProvisioner.approvePendingTenant(tenantId, developerId, options);
  }

  async rejectTenant(tenantId, developerId, reason) {
    return tenantProvisioner.rejectPendingTenant(tenantId, developerId, reason);
  }

  async lockTenant(tenantId, reason) {
    return trialExpiration.lockTenant(tenantId, reason);
  }

  async renewTenant(tenantId, extensionDays = 90, note) {
    return trialExpiration.unlockTenant(tenantId, extensionDays, note);
  }
}

module.exports = new TenantManagementService();
