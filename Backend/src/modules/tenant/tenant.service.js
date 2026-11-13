const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { prisma } = require('../../config/database');
const logger = require('../../utils/logger');
const { AppError, NotFoundError, ConflictError, ValidationError, AuthorizationError } = require('../../utils/errors');
const { getRecordProvenance } = require('../../config/environments');
const { resolveSubscriptionPlan, TENANT_SELECTABLE_PLANS, SUBSCRIPTION_PLANS } = require('./subscriptionPlans');

function buildOnboardingFacialHash(rawImage) {
  if (!rawImage || typeof rawImage !== 'string') return null;
  const base64 = rawImage.includes(',') ? rawImage.split(',')[1] : rawImage;
  const buf = Buffer.from(String(base64 || ''), 'base64');
  if (buf.length === 0) return null;
  const bins = new Array(16).fill(0);
  for (let i = 0; i < buf.length; i++) bins[i % 16] += buf[i] / 255;
  const norm = Math.sqrt(bins.reduce((s, v) => s + v * v, 0)) || 1;
  const vector = bins.map((v) => Number((v / norm).toFixed(4)));
  return JSON.stringify({
    vector,
    hash: crypto.createHash('sha256').update(JSON.stringify(vector)).digest('hex'),
  });
}

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
      gpsAddress = null,
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
      logoUrl = null,
      adminFaceImage = null,
      faceImageBase64 = null,
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
          logoUrl: logoUrl || null,
          companyNameUpdated: false,
          subscriptionPlan: 'TRIAL_1M',
          subscriptionMonths: 1,
          isLifetime: false,
          termsAccepted: true,
          daysLeft: 30,
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
          address: [gpsAddress, address || `${city}, ${country}`].filter(Boolean).join(' • '),
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
          address: [gpsAddress, address || `${city}, ${country}`].filter(Boolean).join(' • '),
          latitude: parseFloat(latitude) || 5.6037,
          longitude: parseFloat(longitude) || -0.1870,
          isHQ: true,
          status: 'PENDING',
        },
      });

      const parts = (representativeName || 'Tenant Director').trim().split(/\s+/);
      const facialHash = buildOnboardingFacialHash(adminFaceImage || faceImageBase64);
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
          gpsAddress: gpsAddress || null,
          gpsLatitude: parseFloat(latitude) || 5.6037,
          gpsLongitude: parseFloat(longitude) || -0.1870,
          facialEnrolled: Boolean(facialHash),
          facialDescriptorHash: facialHash,
          ...getRecordProvenance(),
        },
      });

      if (facialHash) {
        await tx.auditLog.create({
          data: {
            tenantId: tenant.id,
            userId: adminUser.id,
            action: 'FACIAL_VERIFIED',
            entityType: 'user',
            entityId: adminUser.id,
            metadata: { event: 'ONBOARDING_ADMIN_FACE_CAPTURED' },
          },
        }).catch(() => {});
      }

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
      message: 'Onboarding application submitted cleanly. Once Lead Developer Authority approves your institution, your 1-Month Free Trial (30 days) begins immediately and you may create staff accounts.',
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
        logoUrl: true,
        city: true,
        region: true,
        subscriptionPlan: true,
        isLifetime: true,
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

    // Compute live days left & auto-evaluate subscription cycle
    const enriched = await Promise.all(
      tenants.map(async (t) => {
        let daysLeft = t.isLifetime ? 36500 : t.daysLeft;
        let status = t.status;

        if (!t.isLifetime && t.subExpiry) {
          const diffMs = new Date(t.subExpiry).getTime() - now.getTime();
          daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

          if (diffMs <= 0 && status === 'ACTIVE') {
            status = 'LOCKED_EXPIRED';
            await prisma.tenant.update({
              where: { id: t.id },
              data: { status, daysLeft: 0 },
            }).catch(() => { });
          }
        }

        return {
          id: t.id,
          code: t.code,
          institutionId: t.institutionId,
          name: t.name,
          logoUrl: t.logoUrl || null,
          companyNameUpdated: Boolean(t.companyNameUpdated),
          domain: t.domain,
          institutionType: t.institutionType,
          location: t.location || `${t.city || 'Accra'}, ${t.region || 'Ghana'}`,
          region: t.region,
          city: t.city,
          latitude: t.latitude,
          longitude: t.longitude,
          plan: t.planTier,
          subscriptionPlan: t.subscriptionPlan || 'TRIAL_1M',
          subscriptionMonths: t.subscriptionMonths,
          isLifetime: Boolean(t.isLifetime),
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
   * Create a new tenant with a default 30-day 1-month trial cycle (or specified plan)
   */
  async createTenant(data) {
    const code = data.code || `TNT-${Math.floor(100 + Math.random() * 900)}`;
    const startDate = data.subStart ? new Date(data.subStart) : new Date();
    const resolvedPlan = resolveSubscriptionPlan(data.planCode || data.cycleDays, 30);
    const expiryDate = resolvedPlan.isLifetime
      ? null
      : data.subExpiry
        ? new Date(data.subExpiry)
        : new Date(startDate.getTime() + resolvedPlan.days * 24 * 60 * 60 * 1000);

    const diffMs = expiryDate ? expiryDate.getTime() - Date.now() : 0;
    const daysLeft = resolvedPlan.isLifetime ? 36500 : Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const tenant = await prisma.tenant.create({
      data: {
        code,
        name: data.name || 'New Financial Tenant',
        domain: data.domain || null,
        logoUrl: data.logoUrl || null,
        companyNameUpdated: Boolean(data.companyNameUpdated),
        status: data.status || 'ACTIVE',
        planTier: data.plan || data.planTier || resolvedPlan.tier || 'Enterprise',
        subscriptionPlan: resolvedPlan.code,
        subscriptionMonths: resolvedPlan.months,
        isLifetime: resolvedPlan.isLifetime,
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
        planName: resolvedPlan.label || tenant.planTier,
        status: tenant.status,
        startDate,
        endDate: expiryDate || new Date(startDate.getTime() + 36500 * 24 * 60 * 60 * 1000),
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
   * Unlock / Renew Tenant Subscription (+30 Days / Selected Plan)
   */
  async renewTenantSubscription(id, extensionDaysOrPlan = 30) {
    const tenant = await this.getTenantById(id);
    const now = new Date();
    const plan = resolveSubscriptionPlan(extensionDaysOrPlan, 30);
    const newExpiry = plan.subExpiry;

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        status: 'ACTIVE',
        onboardingStatus: plan.code === 'TRIAL_1M' ? 'ACTIVE_TRIAL' : 'ACTIVE_PAID',
        subscriptionPlan: plan.code,
        subscriptionMonths: plan.months,
        isLifetime: plan.isLifetime,
        subStart: now,
        subExpiry: newExpiry,
        daysLeft: plan.days,
        alertSent: false,
      },
    });

    await prisma.tenantSubscription.upsert({
      where: { tenantId: tenant.id },
      update: {
        status: 'ACTIVE',
        planName: plan.label,
        endDate: newExpiry || new Date(now.getTime() + 36500 * 24 * 60 * 60 * 1000),
        lastPaymentAt: now,
      },
      create: {
        tenantId: tenant.id,
        planName: plan.label,
        status: 'ACTIVE',
        startDate: now,
        endDate: newExpiry || new Date(now.getTime() + 36500 * 24 * 60 * 60 * 1000),
        lastPaymentAt: now,
      },
    });

    logger.info(`Tenant subscription renewed: ${tenant.name} (${plan.label})`);
    return updated;
  }

  getSubscriptionCatalog() {
    return {
      trial: SUBSCRIPTION_PLANS.TRIAL_1M,
      plans: TENANT_SELECTABLE_PLANS,
    };
  }

  async getMyTenantProfile(tenantId) {
    if (!tenantId) return null;
    const tenant = await this.getTenantById(tenantId);
    return {
      id: tenant.id,
      code: tenant.code,
      institutionId: tenant.institutionId,
      name: tenant.name,
      logoUrl: tenant.logoUrl || null,
      companyNameUpdated: Boolean(tenant.companyNameUpdated),
      institutionType: tenant.institutionType,
      region: tenant.region,
      city: tenant.city,
      location: tenant.location,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      subscriptionPlan: tenant.subscriptionPlan || 'TRIAL_1M',
      subscriptionMonths: tenant.subscriptionMonths,
      isLifetime: Boolean(tenant.isLifetime),
      subStart: tenant.subStart,
      subExpiry: tenant.subExpiry,
      daysLeft: tenant.daysLeft,
      status: tenant.status,
      onboardingStatus: tenant.onboardingStatus,
    };
  }

  async updateBranding(tenantId, user, data = {}, uploadedFile = null) {
    if (!tenantId) throw new ValidationError('Active institutional tenant context is required.');
    const role = String(user?.role || '').toUpperCase();
    const allowed = ['SUPER_ADMIN', 'COMPANY_OWNER', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'MANAGER', 'EXECUTIVE_MANAGEMENT'];
    if (!allowed.includes(role)) {
      throw new AuthorizationError('Only Company Owner or Branch Manager may update company branding and logo.');
    }

    const existing = await this.getTenantById(tenantId);
    const trimmedName = data.name ? String(data.name).trim() : existing.name;
    if (!trimmedName || trimmedName.length < 2) {
      throw new ValidationError('Company name must be at least 2 characters.');
    }

    let resolvedLogoUrl = existing.logoUrl;
    if (uploadedFile) {
      if (uploadedFile.buffer && uploadedFile.mimetype?.startsWith('image/')) {
        resolvedLogoUrl = `data:${uploadedFile.mimetype};base64,${uploadedFile.buffer.toString('base64')}`;
      } else if (uploadedFile.path) {
        const fs = require('fs');
        const mime = uploadedFile.mimetype || 'image/png';
        if (mime.startsWith('image/') && fs.existsSync(uploadedFile.path)) {
          const buf = fs.readFileSync(uploadedFile.path);
          if (buf.length <= 1500000) {
            resolvedLogoUrl = `data:${mime};base64,${buf.toString('base64')}`;
          }
        }
        if (!resolvedLogoUrl && uploadedFile.filename) {
          resolvedLogoUrl = `/uploads/${uploadedFile.filename}`;
        }
      }
    } else if (data.logoUrl !== undefined) {
      const candidate = String(data.logoUrl || '').trim();
      if (!candidate) {
        resolvedLogoUrl = null;
      } else if (candidate.startsWith('data:image/') || /^https?:\/\//i.test(candidate) || candidate.startsWith('/uploads/')) {
        resolvedLogoUrl = candidate;
      } else {
        throw new ValidationError('Logo must be a valid image upload, https URL, or base64 image data URI.');
      }
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: trimmedName,
        logoUrl: resolvedLogoUrl,
        companyNameUpdated: Boolean(data.name ? true : existing.companyNameUpdated),
        ...(data.location ? { location: String(data.location).trim() } : {}),
        ...(data.city ? { city: String(data.city).trim() } : {}),
        ...(data.region ? { region: String(data.region).trim() } : {}),
        ...(data.contactEmail ? { contactEmail: String(data.contactEmail).trim() } : {}),
        ...(data.contactPhone ? { contactPhone: String(data.contactPhone).trim() } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user.id,
        action: 'COMPANY_BRANDING_UPDATED',
        entityType: 'tenant',
        entityId: tenantId,
        oldValues: { name: existing.name, logoUrl: existing.logoUrl ? '[image]' : null },
        newValues: { name: updated.name, logoUpdated: Boolean(updated.logoUrl), companyNameUpdated: updated.companyNameUpdated },
      },
    }).catch(() => { });

    return this.getMyTenantProfile(tenantId);
  }

  async chooseSubscriptionPlan(tenantId, user, { planCode } = {}) {
    if (!tenantId) throw new ValidationError('Tenant context required');
    const role = String(user?.role || '').toUpperCase();
    const allowed = ['SUPER_ADMIN', 'COMPANY_OWNER', 'BRANCH_MANAGER', 'FINANCE_MANAGER', 'EXECUTIVE_MANAGEMENT'];
    if (!allowed.includes(role)) {
      throw new AuthorizationError('Only Company Owner or Executive/Branch Manager can choose the institutional subscription plan.');
    }

    const allowedCodes = new Set(['PLAN_3M', 'PLAN_6M', 'PLAN_9M', 'PLAN_12M', 'LIFETIME', '3M', '6M', '9M', '12M']);
    const normalized = String(planCode || '').trim().toUpperCase();
    if (!allowedCodes.has(normalized)) {
      throw new ValidationError('Select a valid post-trial subscription plan: 3 Months (PLAN_3M), 6 Months (PLAN_6M), 9 Months (PLAN_9M), 12 Months (PLAN_12M), or Lifetime (LIFETIME).');
    }

    const plan = resolveSubscriptionPlan(normalized, 90);
    const now = new Date();
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'ACTIVE',
        onboardingStatus: 'ACTIVE_PAID',
        planTier: plan.tier,
        subscriptionPlan: plan.code,
        subscriptionMonths: plan.months,
        isLifetime: plan.isLifetime,
        subStart: now,
        subExpiry: plan.subExpiry,
        daysLeft: plan.days,
        alertSent: false,
      },
    });

    await prisma.tenantSubscription.upsert({
      where: { tenantId },
      update: {
        status: 'ACTIVE',
        planName: plan.label,
        startDate: now,
        endDate: plan.subExpiry || new Date(now.getTime() + 36500 * 24 * 60 * 60 * 1000),
        lastPaymentAt: now,
      },
      create: {
        tenantId,
        planName: plan.label,
        status: 'ACTIVE',
        startDate: now,
        endDate: plan.subExpiry || new Date(now.getTime() + 36500 * 24 * 60 * 60 * 1000),
        lastPaymentAt: now,
      },
    });

    await prisma.tenantMessage.create({
      data: {
        tenantId,
        senderType: 'SYSTEM',
        senderName: 'GBS Billing & Licensing',
        subject: `Subscription Activated: ${plan.label}`,
        body: `Your institution ${updated.name} activated ${plan.label}. ${plan.isLifetime ? 'Lifetime access enabled with no expiration.' : `Active until ${plan.subExpiry.toISOString().split('T')[0]}.`}`,
        priority: 'NORMAL',
      },
    }).catch(() => { });

    return {
      plan,
      tenant: await this.getMyTenantProfile(tenantId),
    };
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
