const tenantService = require('../services/tenant.service');

class TenantController {
  async getLocations(req, res, next) {
    try {
      const tenantId = req.params.tenantId || 'DEFAULT_TENANT';
      const locations = await tenantService.getTenantLocations(tenantId);
      res.json({ success: true, locations });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TenantController();
