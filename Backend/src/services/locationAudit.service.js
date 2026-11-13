const locationRepository = require('../repositories/location.repository');

class LocationAuditService {
  async auditCollectorRoute(collectorId) {
    const logs = await locationRepository.findLogsByCollectorId(collectorId, 100);
    return {
      collectorId,
      totalWaypoints: logs.length,
      logs
    };
  }
}

module.exports = new LocationAuditService();
