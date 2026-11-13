const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    const host = config.email?.host || config.email?.smtp?.host || 'localhost';
    const port = config.email?.port || config.email?.smtp?.port || 587;
    const user = config.email?.user || config.email?.smtp?.user || '';
    const pass = config.email?.pass || config.email?.smtp?.pass || '';

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass }
    });
  }

  async sendMail({ to, subject, html, text }) {
    try {
      if (!config.email?.user && !config.email?.smtp?.user) {
        logger.info(`[Email Service Mock Send] To: ${to} | Subject: ${subject}`);
        return { success: true, mock: true };
      }
      const info = await this.transporter.sendMail({
        from: config.email.from,
        to,
        subject,
        html,
        text
      });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      logger.error('Failed to send email:', err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new EmailService();
