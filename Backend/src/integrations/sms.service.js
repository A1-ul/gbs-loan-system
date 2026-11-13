const config = require('../config');
const logger = require('../utils/logger');

function normalizeSmsPhone(phone) {
  const cleaned = String(phone || '').trim().replace(/\s+/g, '');
  if (!cleaned) return '';
  if (/^0\d{9}$/.test(cleaned)) return `+233${cleaned.slice(1)}`;
  if (/^233\d{9}$/.test(cleaned)) return `+${cleaned}`;
  return cleaned;
}

async function sendViaHubtel(phone, message) {
  const response = await fetch('https://api.hubtel.com/v1/messages/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${config.sms.apiKey}:${config.sms.apiSecret}`).toString('base64')}`,
    },
    body: JSON.stringify({
      From: config.sms.senderId || 'GBSLoan',
      To: phone,
      Content: message,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || payload?.Message || `Hubtel SMS error HTTP ${response.status}`);
  }
  return { delivered: true, mock: false, provider: 'hubtel', status: response.status, payload };
}

async function sendViaArkesel(phone, message, apiKey) {
  const recipient = phone.replace(/^\+/, '');
  const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      sender: config.sms.senderId || 'GBSLoan',
      message,
      recipients: [recipient],
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.status === 'error') {
    throw new Error(payload?.message || `Arkesel SMS error HTTP ${response.status}`);
  }
  return { delivered: true, mock: false, provider: 'arkesel', status: response.status, payload };
}

async function sendViaTwilio(phone, message) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  const body = new URLSearchParams({ To: phone, From: from, Body: message });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || `Twilio SMS error HTTP ${response.status}`);
  }
  return { delivered: true, mock: false, provider: 'twilio', status: response.status, payload };
}

async function send(phone, message) {
  const normalizedPhone = normalizeSmsPhone(phone);
  if (!normalizedPhone) {
    return { delivered: false, mock: false, provider: 'INVALID_PHONE', error: 'Recipient phone number is empty or invalid.' };
  }

  const provider = String(process.env.SMS_PROVIDER || config.sms.provider || '').toLowerCase();
  const arkeselKey = process.env.ARKESEL_API_KEY || (provider === 'arkesel' ? config.sms.apiKey : null);
  const hasTwilio = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
  const hasHubtel = Boolean(config.sms.apiKey && config.sms.apiSecret);

  if (arkeselKey && (provider === 'arkesel' || !hasHubtel)) {
    return sendViaArkesel(normalizedPhone, message, arkeselKey);
  }
  if (hasTwilio && (provider === 'twilio' || !hasHubtel)) {
    return sendViaTwilio(normalizedPhone, message);
  }
  if (hasHubtel) {
    return sendViaHubtel(normalizedPhone, message);
  }

  logger.warn(`[SMS Gateway Unconfigured] Unable to deliver carrier SMS to ${normalizedPhone}. Configure SMS_API_KEY/SMS_API_SECRET, ARKESEL_API_KEY, or TWILIO_ACCOUNT_SID.`);
  return {
    delivered: false,
    mock: false,
    provider: 'NONE_CONFIGURED',
    recipient: normalizedPhone,
    error: 'Live SMS gateway not configured on server (set SMS_API_KEY + SMS_API_SECRET, ARKESEL_API_KEY, or TWILIO_* env vars).',
  };
}

module.exports = { send, normalizeSmsPhone };
