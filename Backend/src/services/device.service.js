const deviceRepository = require('../repositories/device.repository');

class DeviceService {
  async getActiveSessions(userId) {
    const tokens = await deviceRepository.findRefreshTokens(userId);
    return { activeSessionsCount: tokens.length, tokens };
  }
}

module.exports = new DeviceService();
