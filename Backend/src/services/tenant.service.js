const tenantRepository = require('../repositories/tenant.repository');

class TenantService {
  async getTenantLocations(tenantId) {
    return tenantRepository.findLocations(tenantId);
  }

  async addBranchLocation(tenantId, data) {
    return tenantRepository.createLocation({ tenantId, ...data });
  }
}

module.exports = new TenantService();
