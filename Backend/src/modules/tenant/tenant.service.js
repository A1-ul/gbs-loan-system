const bcrypt = require('bcryptjs');
const { prisma } = require('../../config/database');
const logger = require('../../utils/logger');
const { AppError, NotFoundError, ConflictError, ValidationError } = require('../../utils/errors');
const { getRecordProvenance } = require('../../config/environments');

class TenantService {
  /**
   * Public institutional onboarding application -> starts in PENDING status until Developer approves
   */
  async submitOnboardingApplication(data) {
    const {
      organizationName,
      institutionType = 'MICROFINANCE',
      contactEmail,
      contactPhone,
      country = 'Ghana',
      region = 'Greater Accra',
      city = 'Accra',
      address,
      latitude = 5.6037,
      longitude = -0.1870,
      registrationNumber,
      businessLicenseNumber,
      tinNumber,
      representativeName,
      representativeEmail,
      representativePhone,
      representativeRole = 'COMPANY_OWNER',
      password,
      planTier = 'ENTERPRISE',
    } = data;

    if (!organizationName || !representativeEmail || !password) {
      throw new ValidationError('Organization name, representative email, and admin password are required.');
    }

    const emailLower = representativeEmail.toLowerCase().trim();
    const phoneNorm = representativePhone || contactPhone || `+23324${Math.floor(1000000 + Math.random() * 8999999)}`;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: emailLower }, { phone: phoneNorm }] },
    });
    if (existingUser) {
      throw new ConflictError('An account with that representative email or phone already exists.');
    }

    const code = `TNT-${Math.floor(1000 + Math.random() * 8999)}`;
    const institutionId = `GBS-INS-${Math.floor(10000 + Math.random() * 89999)}`;
    const passwordHash = await bcrypt.hash(password, 12);

    const created = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          code,
          institutionId,
          name: organizationName.trim(),
          institutionType,
          status: 'PENDING',
          onboardingStatus: 'PENDING',
          planTier,
          country,
          region,
          city,
          location: `${city}, ${region}`,
          latitude: parseFloat(latitude) || 5.6037,
          longitude: parseFloat(longitude) || -0.1870,
          contactEmail: contactEmail || emailLower,
          contactPhone: contactPhone || phoneNorm,
          registrationNumber: registrationNumber || null,
          businessLicenseNumber: businessLicenseNumber || null,
          tinNumber: tinNumber || null,
          representativeName: representativeName || 'Institution Director',
          representativeEmail: emailLower,
          representativePhone: phoneNorm,
          representativeRole,
          termsAccepted: true,
          daysLeft: 90,
          ...getRecordProvenance(),
        },
      });

      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: `${organizationName.trim()} HQ`,
          code: `${code}-HQ`,
          type: 'HEADQUARTERS',
          region,
          city,
          address: address || `${city}, ${country}`,
          latitude: parseFloat(latitude) || 5.6037,
          longitude: parseFloat(longitude) || -0.1870,
          geofenceRadius: 500,
          isMain: true,
          status: 'PENDING',
        },
      });

      await tx.tenantLocation.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          name: `${organizationName.trim()} HQ`,
          branchName: `${organizationName.trim()} HQ`,
          region,
          city,
          address: address || `${city}, ${country}`,
          latitude: parseFloat(latitude) || 5.6037,
          longitude: parseFloat(longitude) || -0.1870,
          isHQ: true,
          status: 'PENDING',
        },
      });

      const parts = (representativeName || 'Tenant Director').trim().split(/\s+/);
      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          email: emailLower,
          phone: phoneNorm,
          passwordHash,
          role: 'COMPANY_OWNER',
          status: 'PENDING_VERIFICATION',
          firstName: parts[0] || 'Tenant',
          lastName: parts.slice(1).join(' ') || 'Director',
          address: address || `${city}, ${region}`,
          ...getRecordProvenance(),
        },
      });

      await tx.securityAlert.create({
        data: {
          tenantId: tenant.id,
          alertType: 'TENANT_ONBOARDING_PENDING',
          severity: 'MEDIUM',
          title: `New Institution Onboarding Request: ${tenant.name}`,
          description: `${tenant.name} (${tenant.code}) submitted onboarding application awaiting Developer verification.`,
        },
      });

      return { tenant, adminUserId: adminUser.id };
    });

    logger.info(`[TenantService] Pending institutional onboarding registered: ${created.tenant.code}`);
    return {
      id: created.tenant.id,
      code: created.tenant.code,
      tenantId: created.tenant.id,
      tenantCode: created.tenant.code,
      institutionId: created.tenant.institutionId,
      name: created.tenant.name,
      representativeEmail: created.tenant.representativeEmail,
      status: created.tenant.status,
      onboardingStatus: created.tenant.onboardingStatus,
      message: 'Onboarding application submitted cleanly. Your tenant requires Lead Developer approval before login access is activated.',
    };
  }

  /**
   * Public onboarding status check by tenant code or representative email
   */
  async checkOnboardingStatus(identifier) {
    const clean = String(identifier || '').trim();
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { code: clean.toUpperCase() },
          { institutionId: clean.toUpperCase() },
          { representativeEmail: clean.toLowerCase() },
        ],
      },
      select: {
        id: true,
        code: true,
        institutionId: true,
        name: true,
        status: true,
        onboardingStatus: true,
        daysLeft: true,
        rejectionReason: true,
        approvedAt: true,
        createdAt: true,
      },
    });
    if (!tenant) throw new NotFoundError(`Onboarding application '${identifier}'`);
    return tenant;
  }

  /**
   * Public directory of APPROVED/ACTIVE tenants for Login selector (minimal safe metadata)
   */
  async getPublicActiveDirectory() {
    return prisma.tenant.findMany({
      where: {
        status: { in: ['ACTIVE', 'EXPIRING_SOON'] },
        onboardingStatus: { in: ['APPROVED', 'ACTIVE_TRIAL', 'ACTIVE_PAID', 'TRIAL_EXPIRING'] },
      },
      select: {
        id: true,
        code: true,
        name: true,
        city: true,
        region: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Fetch broadcast & direct messages for a tenant from Developer Authority
   */
  async getMessagesForTenant(tenantId) {
    if (!tenantId) return [];
    return prisma.tenantMessage.findMany({
      where: {
        OR: [{ tenantId }, { tenantId: null }],
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  /**
   * Fetch all tenants with branch count and computed subscription days left
   */
  async getAllTenants() {
    const now = new Date();
    const tenants = await prisma.tenant.findMany({
      include: {
        branches: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute live days left & auto-evaluate 90-day cycle
    const enriched = await Promise.all(
      tenants.map(async (t) => {
        let daysLeft = t.daysLeft;
        let status = t.status;

        if (t.subExpiry) {
          const diffMs = new Date(t.subExpiry).getTime() - now.getTime();
          daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

          if (diffMs <= 0 && status === 'ACTIVE') {
            status = 'LOCKED_EXPIRED';
            await prisma.tenant.update({
              where: { id: t.id },
              data: { status, daysLeft: 0 },
            }).catch(() => {});
          }
        }

        return {
          id: t.id,
          code: t.code,
          institutionId: t.institutionId,
          name: t.name,
          domain: t.domain,
          institutionType: t.institutionType,
          location: t.location || `${t.city || 'Accra'}, ${t.region || 'Ghana'}`,
          region: t.region,
          city: t.city,
          latitude: t.latitude,
          longitude: t.longitude,
          plan: t.planTier,
          contactEmail: t.contactEmail,
          contactPhone: t.contactPhone,
          representativeName: t.representativeName,
          representativeEmail: t.representativeEmail,
          registrationNumber: t.registrationNumber,
          onboardingStatus: t.onboardingStatus,
          subStart: t.subStart ? t.subStart.toISOString().split('T')[0] : null,
          subExpiry: t.subExpiry ? t.subExpiry.toISOString().split('T')[0] : null,
          daysLeft,
          status,
          alertSent: t.alertSent,
          branchesCount: t.branches.length,
          branches: t.branches,
          createdAt: t.createdAt,
        };
      })
    );

    return enriched;
  }

  /**
   * Fetch single tenant with details
   */
  async getTenantById(id) {
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
      include: {
        branches: true,
        subscriptions: true,
        locations: true,
      },
    });

    if (!tenant) {
      throw new NotFoundError(`Tenant with id/code '${id}'`);
    }

    return tenant;
  }

  /**
   * Create a new tenant with a default 90-day subscription cycle
   */
  async createTenant(data) {
    const code = data.code || `TNT-${Math.floor(100 + Math.random() * 900)}`;
    const startDate = data.subStart ? new Date(data.subStart) : new Date();
    const cycleDays = parseInt(data.cycleDays, 10) || 90;
    const expiryDate = data.subExpiry
      ? new Date(data.subExpiry)
      : new Date(startDate.getTime() + cycleDays * 24 * 60 * 60 * 1000);

    const diffMs = expiryDate.getTime() - Date.now();
    const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const tenant = await prisma.tenant.create({
      data: {
        code,
        name: data.name || 'New Financial Tenant',
        domain: data.domain || null,
        status: data.status || 'ACTIVE',
        planTier: data.plan || data.planTier || 'Enterprise',
        location: data.location || 'Accra, Ghana',
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        currency: data.currency || 'GHS',
        subStart: startDate,
        subExpiry: expiryDate,
        daysLeft,
        alertSent: false,
        settings: data.settings || {},
      },
    });

    // Create initial subscription record
    await prisma.tenantSubscription.create({
      data: {
        tenantId: tenant.id,
        planName: tenant.planTier,
        status: tenant.status,
        startDate,
        endDate: expiryDate,
        gracePeriodDays: 7,
        autoRenew: true,
      },
    });

    // If initial branch info provided, create main headquarters branch
    if (data.branchName || data.name) {
      await prisma.branch.create({
        data: {
          tenantId: tenant.id,
          name: data.branchName || `${tenant.name} Main Branch`,
          code: `${tenant.code}-HQ`,
          type: 'HEADQUARTERS',
          region: data.region || 'Greater Accra',
          city: data.city || 'Accra',
          address: data.address || data.location,
          latitude: parseFloat(data.lat) || 5.6037,
          longitude: parseFloat(data.lng) || -0.1870,
          isMain: true,
          status: 'ACTIVE',
        },
      });
    }

    logger.info(`Tenant created successfully: ${tenant.name} (${tenant.code})`);
    return this.getTenantById(tenant.id);
  }

  /**
   * Update tenant organization details
   */
  async updateTenant(id, data) {
    await this.getTenantById(id);

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        name: data.name,
        domain: data.domain,
        location: data.location,
        planTier: data.plan || data.planTier,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        status: data.status,
      },
    });

    return updated;
  }

  /**
   * Emergency Lock / Suspend Tenant
   */
  async lockTenant(id, reason = 'Developer Security Suspension') {
    const tenant = await this.getTenantById(id);

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

    logger.warn(`Tenant locked: ${tenant.name} (${tenant.code}) - Reason: ${reason}`);
    return updated;
  }

  /**
   * Unlock / Renew Tenant Subscription (+90 Days)
   */
  async renewTenantSubscription(id, extensionDays = 90) {
    const tenant = await this.getTenantById(id);
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

    await prisma.tenantSubscription.upsert({
      where: { tenantId: tenant.id },
      update: {
        status: 'ACTIVE',
        endDate: newExpiry,
        lastPaymentAt: now,
      },
      create: {
        tenantId: tenant.id,
        planName: tenant.planTier,
        status: 'ACTIVE',
        startDate: now,
        endDate: newExpiry,
        lastPaymentAt: now,
      },
    });

    logger.info(`Tenant subscription renewed: ${tenant.name} for ${extensionDays} days until ${newExpiry.toISOString()}`);
    return updated;
  }

  /**
   * Permanently delete a tenant organization
   */
  async deleteTenant(id) {
    const tenant = await this.getTenantById(id);
    await prisma.tenant.delete({
      where: { id: tenant.id },
    });
    logger.warn(`Tenant deleted permanently: ${tenant.name} (${tenant.code})`);
    return { success: true, message: `Tenant ${tenant.name} permanently deleted` };
  }

  // ==========================================
  // BRANCH MANAGEMENT
  // ==========================================

  /**
   * List all branches for a tenant
   */
  async getTenantBranches(tenantId) {
    const tenant = await this.getTenantById(tenantId);
    return prisma.branch.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Create a new branch under a tenant
   */
  async createBranch(tenantId, data) {
    const tenant = await this.getTenantById(tenantId);
    const code = data.code || `${tenant.code}-BR-${Math.floor(10 + Math.random() * 90)}`;

    const branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: data.name,
        code,
        type: data.type || 'DISTRICT',
        region: data.region || 'Greater Accra',
        city: data.city || 'Accra',
        address: data.address,
        latitude: parseFloat(data.latitude || data.lat) || 5.6037,
        longitude: parseFloat(data.longitude || data.lng) || -0.1870,
        geofenceRadius: parseFloat(data.geofenceRadius) || 500,
        isMain: !!data.isMain,
        status: data.status || 'ACTIVE',
      },
    });

    logger.info(`Branch created: ${branch.name} (${branch.code}) under tenant ${tenant.name}`);
    return branch;
  }

  /**
   * Update a branch
   */
  async updateBranch(branchId, data) {
    return prisma.branch.update({
      where: { id: branchId },
      data: {
        name: data.name,
        type: data.type,
        region: data.region,
        city: data.city,
        address: data.address,
        latitude: data.latitude ? parseFloat(data.latitude) : undefined,
        longitude: data.longitude ? parseFloat(data.longitude) : undefined,
        geofenceRadius: data.geofenceRadius ? parseFloat(data.geofenceRadius) : undefined,
        status: data.status,
      },
    });
  }

  /**
   * Delete a branch
   */
  async deleteBranch(branchId) {
    return prisma.branch.delete({
      where: { id: branchId },
    });
  }
}

module.exports = new TenantService();
