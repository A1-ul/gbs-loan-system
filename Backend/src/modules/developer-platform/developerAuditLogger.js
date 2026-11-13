/**
 * GBS LOAN MANAGEMENT SYSTEM - Developer Control Center Audit Logger
 * CommonJS Production Logging Service
 */

const fs = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

const AUDIT_LOG_DIR = path.join(__dirname, '../../../logs/developer-audit');

if (!fs.existsSync(AUDIT_LOG_DIR)) {
  fs.mkdirSync(AUDIT_LOG_DIR, { recursive: true });
}

class DeveloperAuditLogger {
  static logEvent(action, developerId, details = {}, ip = '127.0.0.1') {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      action,
      developerId,
      ip,
      details,
    };

    const fileName = `dev-audit-${timestamp.split('T')[0]}.log`;
    const filePath = path.join(AUDIT_LOG_DIR, fileName);

    fs.appendFileSync(filePath, JSON.stringify(logEntry) + '\n', 'utf8');
    logger.info(`[DEV CONTROL AUDIT] ${action} by dev: ${developerId} IP: ${ip}`);
    return logEntry;
  }

  static getRecentLogs(limit = 100) {
    const today = new Date().toISOString().split('T')[0];
    const filePath = path.join(AUDIT_LOG_DIR, `dev-audit-${today}.log`);

    if (!fs.existsSync(filePath)) {
      return [];
    }

    const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
    return lines
      .slice(-limit)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);
  }
}

module.exports = DeveloperAuditLogger;
