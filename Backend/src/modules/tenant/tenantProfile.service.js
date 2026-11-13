/**
 * GBS LOAN MANAGEMENT SYSTEM - TENANT PROFILE SERVICE
 * Profile & Settings Manager for Enterprise Tenants
 * Standard: Node.js CommonJS
 */

const { prisma } = require('../../config/database');
const logger = require('../../utils/logger');
const { NotFoundError } = require('../../utils/errors');

class TenantProfileService {
  async getProfile(tenantId) {
    const tenant = await prisma.tenant.findFirst({
      where: { OR: [{ id: tenantId }, { code: tenantId }] },
      include: {
        branches: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!tenant) throw new NotFoundError(`Tenant '${tenantId}'`);
    return tenant;
  }

  async updateProfile(tenantId, updateData) {
    const tenant = await prisma.tenant.findFirst({
      where: { OR: [{ id: tenantId }, { code: tenantId }] },
    });

    if (!tenant) throw new NotFoundError(`Tenant '${tenantId}'`);

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        name: updateData.name !== undefined ? updateData.name : tenant.name,
        contactEmail: updateData.contactEmail !== undefined ? updateData.contactEmail : tenant.contactEmail,
        contactPhone: updateData.contactPhone !== undefined ? updateData.contactPhone : tenant.contactPhone,
        location: updateData.location !== undefined ? updateData.location : tenant.location,
        domain: updateData.domain !== undefined ? updateData.domain : tenant.domain,
        settings: updateData.settings !== undefined ? updateData.settings : tenant.settings,
      },
    });

    logger.info(`[TenantProfile] Profile updated for tenant ${tenant.name} (${tenant.code})`);
    return updated;
  }

  async findOne(id) {
    return this.getProfile(id);
  }
}

module.exports = new TenantProfileService();
