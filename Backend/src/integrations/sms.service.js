const config = require('../config');
const logger = require('../utils/logger');

async function send(phone, message) {
  if (!config.sms.apiKey) {
    logger.info(`[SMS Mock] To: ${phone}, Message: ${message}`);
    return { success: true, mock: true };
  }

  const response = await fetch(`https://api.hubtel.com/v1/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${config.sms.apiKey}:${config.sms.apiSecret}`).toString('base64')}`,
    },
    body: JSON.stringify({
      From: config.sms.senderId,
      To: phone,
      Content: message,
    }),
  });

  return response.json();
}

module.exports = { send };
