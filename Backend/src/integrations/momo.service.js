const config = require('../config');
const logger = require('../utils/logger');

let accessToken = null;
let tokenExpiry = null;

async function getAccessToken() {
  if (accessToken && tokenExpiry > Date.now()) return accessToken;

  const credentials = Buffer.from(`${config.momo.apiUser}:${config.momo.apiKey}`).toString('base64');
  const response = await fetch(`${config.momo.baseUrl}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Ocp-Apim-Subscription-Key': config.momo.subscriptionKey,
    },
  });

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  return accessToken;
}

async function requestToPay({ amount, phone, externalId }) {
  const token = await getAccessToken();

  const response = await fetch(`${config.momo.baseUrl}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Reference-Id': externalId,
      'X-Target-Environment': config.momo.targetEnvironment,
      'Ocp-Apim-Subscription-Key': config.momo.subscriptionKey,
      'Content-Type': 'application/json',
      'X-Callback-Url': config.momo.callbackUrl,
    },
    body: JSON.stringify({
      amount: amount.toString(),
      currency: 'GHS',
      externalId,
      payer: { partyIdType: 'MSISDN', partyId: phone.replace('+', '') },
      payerMessage: 'GBS Loan Payment',
      payeeNote: 'Loan repayment',
    }),
  });

  if (response.status === 202) {
    return { status: 'PENDING', referenceId: externalId };
  }

  logger.error('MoMo request failed:', await response.text());
  throw new Error('MoMo payment initiation failed');
}

async function getTransactionStatus(referenceId) {
  const token = await getAccessToken();

  const response = await fetch(`${config.momo.baseUrl}/collection/v1_0/requesttopay/${referenceId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Target-Environment': config.momo.targetEnvironment,
      'Ocp-Apim-Subscription-Key': config.momo.subscriptionKey,
    },
  });

  return response.json();
}

module.exports = { requestToPay, getTransactionStatus };
