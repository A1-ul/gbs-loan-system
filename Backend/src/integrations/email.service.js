const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: false,
      auth: { user: config.email.user, pass: config.email.pass },
    });
  }
  return transporter;
}

async function send(to, subject, html) {
  if (!config.email.user) {
    logger.info(`[Email Mock] To: ${to}, Subject: ${subject}`);
    return { success: true, mock: true };
  }

  return getTransporter().sendMail({
    from: config.email.from,
    to,
    subject,
    html,
  });
}

module.exports = { send };
