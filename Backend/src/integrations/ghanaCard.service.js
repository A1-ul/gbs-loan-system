const config = require('../config');
const logger = require('../utils/logger');

async function verify(cardNumber, firstName, lastName) {
  if (!config.ghanaCard.apiUrl) {
    logger.warn('Ghana Card API not configured - skipping verification');
    return true;
  }

  try {
    const response = await fetch(`${config.ghanaCard.apiUrl}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ghanaCard.apiKey}`,
      },
      body: JSON.stringify({ cardNumber, firstName, lastName }),
    });

    const data = await response.json();
    return data.verified === true;
  } catch (error) {
    logger.error('Ghana Card verification failed:', error);
    return false;
  }
}

module.exports = { verify };
