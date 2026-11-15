/**
 * GBS LOAN MANAGEMENT SYSTEM - ENTERPRISE TENANT PROVISIONER SERVICE
 * Automated Multi-Tenant Provisioning Engine (No-Mock Production Implementation)
 * Standard: Node.js CommonJS
 */

const { prisma } = require('../../config/database');
const logger = require('../../utils/logger');
const bcrypt = require('bcryptjs');
const { AppError, NotFoundError } = require('../../utils/errors');
const { getRecordProvenance } = require('../../config/environments');
const { resolveSubscriptionPlan } = require('./subscriptionPlans');

class TenantProvisionerService {
  /**
   * Provision a complete enterprise tenant organization with:
   * 1. Tenant record (30-day 1-month trial countdown by default)
   * 2. Headquarters branch + GIS Location
   * 3. Initial subscription record
   * 4. Primary Tenant Administrator account (passwordHash!)
   * 5. Default Loan Products
   */
  async provisionTenant(provisionData) {
    const {
      organizationName,
      tenantCode,
      domain,
      institutionType = 'MICROFINANCE',
      primaryContactEmail,
      primaryContactPhone,
      address,
      region = 'Greater Accra',
      city = 'Accra',
      country = 'Ghana',
      latitude = 5.6037,
      longitude = -0.1870,
      adminFullName,
      adminEmail,
      adminPhone,
      adminPassword = 'TempPassword123!',
      registrationNumber,
      businessLicenseNumber,
      tinNumber,
      planTier = 'ENTERPRISE',
      planCode = null,
      cycleDays = 30,
      currency = 'GHS',
      approvedByDeveloperId = null,
    } = provisionData;

    if (!organizationName) {
      throw new AppError('Organization name is required for provisioning', 400);
    }

    const code = tenantCode || `TNT-${Math.floor(100 + Math.random() * 900)}`;
    const institutionId = `GBS-INS-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const resolvedPlan = resolveSubscriptionPlan(planCode || cycleDays, 30);
    const expiryDate = resolvedPlan.subExpiry;

    logger.info(`[TenantProvisioner] Starting provisioning for: ${organizationName} (${code})`);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          code,
          institutionId,
          name: organizationName,
          domain: domain || null,
          institutionType,
          status: 'ACTIVE',
          onboardingStatus: 'ACTIVE_TRIAL',
          planTier,
          country,
          region,
          city,
          location: `${city}, ${region}`,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          contactEmail: primaryContactEmail || adminEmail,
          contactPhone: primaryContactPhone || adminPhone,
          registrationNumber: registrationNumber || null,
          businessLicenseNumber: businessLicenseNumber || null,
          tinNumber: tinNumber || null,
          representativeName: adminFullName || 'Tenant Administrator',
          representativeEmail: adminEmail || primaryContactEmail || null,
          representativePhone: adminPhone || primaryContactPhone || null,
          representativeRole: 'COMPANY_OWNER',
          approvedByDeveloperId,
          approvedAt: approvedByDeveloperId ? now : null,
          currency,
          subscriptionPlan: resolvedPlan.code,
          subscriptionMonths: resolvedPlan.months,
          isLifetime: resolvedPlan.isLifetime,
          subStart: now,
          subExpiry: expiryDate,
          daysLeft: resolvedPlan.days,
          alertSent: false,
          settings: {
            provisionedAt: now.toISOString(),
            allowMobileAgents: true,
            voiceBiometricsRequired: true,
            defaultLoanInterestRate: 15.0,
          },
          ...getRecordProvenance(),
        },
      });

      const subscription = await tx.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          planName: planTier,
          status: 'ACTIVE',
          startDate: now,
          endDate: expiryDate,
          gracePeriodDays: 7,
          autoRenew: true,
        },
      });

      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          name: `${organizationName} Main Branch`,
          code: `${code}-HQ`,
          type: 'HEADQUARTERS',
          region,
          city,
          address: address || `${city}, ${country}`,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          geofenceRadius: 500,
          isMain: true,
          status: 'ACTIVE',
        },
      });

      await tx.tenantLocation.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          name: `${organizationName} HQ Coordinates`,
          branchName: `${organizationName} HQ`,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          region,
          city,
          address: address || `${city}, ${country}`,
          geofenceRadius: 500,
          isHQ: true,
          status: 'ACTIVE',
        },
      });

      await tx.loanProduct.createMany({
        data: [
          {
            tenantId: tenant.id,
            code: `${code}-MICRO`,
            name: 'SME & Micro Business Loan',
            category: 'MICRO_LOAN',
            interestRate: 14.5,
            minAmount: 500,
            maxAmount: 50000,
            minTermMonths: 3,
            maxTermMonths: 24,
            penaltyRate: 2.0,
          },
          {
            tenantId: tenant.id,
            code: `${code}-SAL`,
            name: 'Payroll Salary Advance Loan',
            category: 'SALARY_LOAN',
            interestRate: 11.0,
            minAmount: 300,
            maxAmount: 30000,
            minTermMonths: 1,
            maxTermMonths: 12,
            penaltyRate: 1.5,
          },
        ],
      });

      let adminUser = null;
      if (adminEmail) {
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        adminUser = await tx.user.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            email: adminEmail.toLowerCase().trim(),
            username: adminEmail.split('@')[0],
            passwordHash: hashedPassword,
            firstName: adminFullName ? adminFullName.split(' ')[0] : 'Tenant',
            lastName: adminFullName ? adminFullName.split(' ').slice(1).join(' ') || 'Admin' : 'Admin',
            phone: adminPhone || `+23320${Math.floor(1000000 + Math.random() * 8999999)}`,
            role: 'COMPANY_OWNER',
            status: 'ACTIVE',
            isEmailVerified: true,
            isPhoneVerified: true,
            qualificationVerified: true,
            metadata: {
              isProvisionedOwner: true,
              provisionedAt: now.toISOString(),
            },
            ...getRecordProvenance(),
          },
        });
      }

      return {
        tenant,
        subscription,
        branch,
        adminUser: adminUser ? { id: adminUser.id, email: adminUser.email, role: adminUser.role } : null,
      };
    });

    logger.info(`[TenantProvisioner] Successfully provisioned tenant ${organizationName} (ID: ${result.tenant.id})`);
    return result;
  }

  /**
   * Developer approves a PENDING tenant onboarding application:
   * - Starts 1-month (30-day) free trial countdown (or selected plan)
   * - Activates tenant admin user(s)
   * - Seeds default loan products if absent
   * - Logs immutable DeveloperAuditLog & welcome TenantMessage
   */
  async approvePendingTenant(tenantId, developerId, { trialDays = 30, planCode = 'TRIAL_1M', notes = 'Institution verified & approved by Lead Developer' } = {}) {
    const tenant = await prisma.tenant.findFirst({
      where: { OR: [{ id: tenantId }, { code: tenantId }] },
      include: { branches: true, loanProducts: true },
    });
    if (!tenant) throw new NotFoundError(`Tenant '${tenantId}'`);

    const now = new Date();
    const resolvedPlan = resolveSubscriptionPlan(planCode || trialDays, 30);
    const expiryDate = resolvedPlan.subExpiry;

    const updated = await prisma.$transaction(async (tx) => {
      const t = await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          status: 'ACTIVE',
          onboardingStatus: resolvedPlan.code === 'TRIAL_1M' ? 'ACTIVE_TRIAL' : 'ACTIVE_PAID',
          subscriptionPlan: resolvedPlan.code,
          subscriptionMonths: resolvedPlan.months,
          isLifetime: resolvedPlan.isLifetime,
          approvedByDeveloperId: developerId || null,
          approvedAt: now,
          rejectionReason: null,
          subStart: now,
          subExpiry: expiryDate,
          daysLeft: resolvedPlan.days,
          alertSent: false,
        },
      });

      await tx.tenantSubscription.upsert({
        where: { tenantId: tenant.id },
        update: { status: 'ACTIVE', startDate: now, endDate: expiryDate },
        create: {
          tenantId: tenant.id,
          planName: tenant.planTier || 'ENTERPRISE',
          status: 'ACTIVE',
          startDate: now,
          endDate: expiryDate,
          gracePeriodDays: 7,
          autoRenew: true,
        },
      });

      // Activate all pending onboarding users, branches, and GIS locations belonging to this tenant
      await tx.user.updateMany({
        where: { tenantId: tenant.id, status: 'PENDING_VERIFICATION' },
        data: { status: 'ACTIVE', qualificationVerified: true, isEmailVerified: true },
      });

      await tx.branch.updateMany({
        where: { tenantId: tenant.id, status: 'PENDING' },
        data: { status: 'ACTIVE' },
      });

      await tx.tenantLocation.updateMany({
        where: { tenantId: tenant.id, status: 'PENDING' },
        data: { status: 'ACTIVE' },
      });

      if (!tenant.loanProducts || tenant.loanProducts.length === 0) {
        await tx.loanProduct.createMany({
          data: [
            {
              tenantId: tenant.id,
              code: `${tenant.code}-STD`,
              name: 'Standard Enterprise Microloan',
              category: 'MICRO_LOAN',
              interestRate: 14.0,
              minAmount: 500,
              maxAmount: 50000,
              minTermMonths: 3,
              maxTermMonths: 24,
              penaltyRate: 2.0,
            },
          ],
        });
      }

      await tx.tenantMessage.create({
        data: {
          tenantId: tenant.id,
          senderType: 'DEVELOPER',
          senderName: 'GBS Developer Control Authority',
          subject: `Welcome ${tenant.name} — ${resolvedPlan.label} Activated`,
          body: `${notes}. Your organization ID is ${tenant.code}. ${resolvedPlan.isLifetime ? 'Lifetime access active.' : `1-Month free trial / subscription active until ${expiryDate.toISOString().split('T')[0]}.`} Please update your company name & logo inside Company Settings and create/approve your staff before they sign in.`,
          priority: 'HIGH',
        },
      });

      await tx.developerAuditLog.create({
        data: {
          developerUserId: developerId || null,
          action: 'TENANT_APPROVED',
          targetComponent: `tenant:${tenant.code}`,
          details: { tenantId: tenant.id, name: tenant.name, planCode: resolvedPlan.code, trialDays: resolvedPlan.days, notes },
          status: 'SUCCESS',
        },
      });

      return t;
    });

    return updated;
  }

  /**
   * Developer rejects a pending tenant onboarding application
   */
  async rejectPendingTenant(tenantId, developerId, reason = 'KYC / institutional documentation rejected') {
    const tenant = await prisma.tenant.findFirst({
      where: { OR: [{ id: tenantId }, { code: tenantId }] },
    });
    if (!tenant) throw new NotFoundError(`Tenant '${tenantId}'`);

    const updated = await prisma.$transaction(async (tx) => {
      const t = await tx.tenant.update({
        where: { id: tenant.id },
        data: {
          status: 'REJECTED',
          onboardingStatus: 'REJECTED',
          rejectionReason: reason,
        },
      });

      await tx.user.updateMany({
        where: { tenantId: tenant.id },
        data: { status: 'REJECTED' },
      });

      await tx.developerAuditLog.create({
        data: {
          developerUserId: developerId || null,
          action: 'TENANT_REJECTED',
          targetComponent: `tenant:${tenant.code}`,
          details: { tenantId: tenant.id, name: tenant.name, reason },
          status: 'SUCCESS',
        },
      });

      return t;
    });

    return updated;
  }
}

module.exports = new TenantProvisionerService();
