const config = require('../config');
const logger = require('../utils/logger');

class SmsService {
  async sendSms(phone, message) {
    logger.info(`[SMS Gateway Hubtel Send] Phone: ${phone} | Msg: ${message}`);
    return {
      success: true,
      messageId: `SMS-${Date.now()}`,
      recipient: phone,
      provider: config.sms.provider
    };
  }
}

module.exports = new SmsService();
