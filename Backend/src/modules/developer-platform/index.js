/**
 * GBS Enterprise Developer Platform Structure (Step 5)
 * Hidden Developer Control Center
 * 
 * 12 Pillars:
 * 1. Remote Monitoring
 * 2. Live Diagnostics
 * 3. Crash Reports
 * 4. System Lock/Unlock
 * 5. Subscription Control
 * 6. Deployment History
 * 7. Logs
 * 8. Performance
 * 9. Backup/Restore
 * 10. Recovery
 * 11. Security Alerts
 * 12. Tenant Management
 */

const developerRoutes = require('./routes/developerControl.routes');
const developerControlService = require('./services/developerControl.service');
const developerController = require('./controllers/developerControl.controller');

const remoteMonitoring = require('./remote-monitoring');
const liveDiagnostics = require('./live-diagnostics');
const crashReports = require('./crash-reports');
const systemLock = require('./system-lock');
const subscriptionControl = require('./subscription-control');
const deploymentHistory = require('./deployment-history');
const backupRestore = require('./backup-restore');
const recovery = require('./recovery');
const securityAlerts = require('./security-alerts');
const tenantManagement = require('./tenant-management');

module.exports = {
  developerRoutes,
  developerControlService,
  developerController,
  remoteMonitoring,
  liveDiagnostics,
  crashReports,
  systemLock,
  subscriptionControl,
  deploymentHistory,
  backupRestore,
  recovery,
  securityAlerts,
  tenantManagement,
};
