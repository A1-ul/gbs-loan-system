const tenantService = require('./tenant.service');
const countdownEngine = require('./countdownEngine.service');
const logger = require('../../utils/logger');

class TenantController {
  // Public Onboarding Application (Awaits Developer Approval)
  async submitOnboarding(req, res, next) {
    try {
      const result = await tenantService.submitOnboardingApplication(req.body);
      return res.status(201).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err) {
      logger.error('Tenant onboarding error:', err);
      next(err);
    }
  }

  async checkOnboardingStatus(req, res, next) {
    try {
      const status = await tenantService.checkOnboardingStatus(req.params.identifier);
      return res.status(200).json({ success: true, data: status });
    } catch (err) {
      next(err);
    }
  }

  async getPublicDirectory(req, res, next) {
    try {
      const directory = await tenantService.getPublicActiveDirectory();
      return res.status(200).json({ success: true, data: directory });
    } catch (err) {
      next(err);
    }
  }

  async getMyCountdown(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      if (!tenantId) {
        return res.status(200).json({
          success: true,
          data: { status: 'ACTIVE', isLocked: false, countdown: { days: 90, hours: 0, minutes: 0, seconds: 0 } },
        });
      }
      const data = await countdownEngine.getTenantCountdown(tenantId);
      return res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getMyMessages(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      const messages = await tenantService.getMessagesForTenant(tenantId);
      return res.status(200).json({ success: true, data: messages });
    } catch (err) {
      next(err);
    }
  }

  async getAllTenants(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      if (tenantId) {
        const own = await tenantService.getTenantById(tenantId);
        return res.status(200).json({
          success: true,
          message: 'Tenant organization retrieved successfully',
          data: [own],
        });
      }
      const tenants = await tenantService.getAllTenants();
      return res.status(200).json({
        success: true,
        message: 'Tenant organizations retrieved successfully',
        data: tenants,
      });
    } catch (err) {
      logger.error('Error fetching tenants:', err);
      next(err);
    }
  }

  async getTenantById(req, res, next) {
    try {
      const targetId = req.params.id === 'my' ? req.tenantId : req.params.id;
      const tenant = await tenantService.getTenantById(targetId);
      if (req.tenantId && tenant.id !== req.tenantId) {
        return res.status(403).json({ success: false, message: 'Cross-tenant inspection forbidden.' });
      }
      return res.status(200).json({ success: true, data: tenant });
    } catch (err) {
      next(err);
    }
  }

  async createTenant(req, res, next) {
    try {
      const tenant = await tenantService.createTenant(req.body);
      return res.status(201).json({
        success: true,
        message: 'Tenant organization registered successfully',
        data: tenant,
      });
    } catch (err) {
      logger.error('Error creating tenant:', err);
      next(err);
    }
  }

  async updateTenant(req, res, next) {
    try {
      if (req.tenantId && req.params.id !== req.tenantId) {
        return res.status(403).json({ success: false, message: 'Cross-tenant modification forbidden.' });
      }
      const tenant = await tenantService.updateTenant(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Tenant organization updated successfully',
        data: tenant,
      });
    } catch (err) {
      next(err);
    }
  }

  async lockTenant(req, res, next) {
    try {
      const { reason } = req.body;
      const tenant = await tenantService.lockTenant(req.params.id, reason);
      return res.status(200).json({
        success: true,
        message: `Tenant ${tenant.name} has been suspended/locked`,
        data: tenant,
      });
    } catch (err) {
      next(err);
    }
  }

  async renewSubscription(req, res, next) {
    try {
      const { extensionDays } = req.body;
      const tenant = await tenantService.renewTenantSubscription(req.params.id, extensionDays || 90);
      return res.status(200).json({
        success: true,
        message: `Tenant ${tenant.name} subscription renewed for ${tenant.daysLeft} days`,
        data: tenant,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteTenant(req, res, next) {
    try {
      const result = await tenantService.deleteTenant(req.params.id);
      return res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getBranches(req, res, next) {
    try {
      const targetId = req.params.id === 'my' ? req.tenantId : req.params.id;
      const branches = await tenantService.getTenantBranches(targetId);
      return res.status(200).json({ success: true, data: branches });
    } catch (err) {
      next(err);
    }
  }

  async createBranch(req, res, next) {
    try {
      const targetId = req.params.id === 'my' ? req.tenantId : req.params.id;
      const branch = await tenantService.createBranch(targetId, req.body);
      return res.status(201).json({
        success: true,
        message: 'Branch created successfully',
        data: branch,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateBranch(req, res, next) {
    try {
      const branch = await tenantService.updateBranch(req.params.branchId, req.body);
      return res.status(200).json({
        success: true,
        message: 'Branch updated successfully',
        data: branch,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteBranch(req, res, next) {
    try {
      await tenantService.deleteBranch(req.params.branchId);
      return res.status(200).json({
        success: true,
        message: 'Branch deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TenantController();
