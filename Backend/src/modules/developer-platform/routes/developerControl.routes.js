const express = require('express');
const developerController = require('../controllers/developerControl.controller');
const { authenticateDeveloper } = require('../../../middleware/developerAuth');
const { authLimiter, sensitiveOpLimiter } = require('../../../middleware/rateLimiter');

// Step 5 Subsystem Controllers (Landlord Exclusive)
const remoteMonitoring = require('../remote-monitoring');
const liveDiagnostics = require('../live-diagnostics');
const crashReports = require('../crash-reports');
const systemLock = require('../system-lock');
const subscriptionControl = require('../subscription-control');
const deploymentHistory = require('../deployment-history');
const backupRestore = require('../backup-restore');
const recovery = require('../recovery');
const securityAlerts = require('../security-alerts');
const tenantManagement = require('../tenant-management');

const router = express.Router();

// Isolated Landlord Authentication Routes (NEVER accepts tenant user tokens)
router.post('/auth/login', authLimiter, developerController.login);
router.post('/auth/logout', authenticateDeveloper, developerController.logout);
router.get('/auth/me', authenticateDeveloper, developerController.getMe);

// ALL Developer Platform Controls STRICTLY guarded by authenticateDeveloper
router.use(authenticateDeveloper);

// Developer Dashboard & Live GIS Map Telemetry
router.get('/dashboard', developerController.getDashboard);
router.get('/locations', developerController.getLocations);
router.get('/locations/live', developerController.getLocations);

// 1. Remote Monitoring
router.get('/monitoring', remoteMonitoring.controller.getMetrics);
router.get('/monitoring/heartbeat', remoteMonitoring.controller.getHeartbeat);

// 2. Live Diagnostics & AI Code Diagnostics
router.get('/diagnostics', liveDiagnostics.controller.runDiagnostics);
router.post('/diagnostics', liveDiagnostics.controller.runDiagnostics);
router.get('/ai-diagnostics', developerController.runDiagnostics);

// 3. Crash Reports
router.get('/crash-reports', crashReports.controller.getCrashReports);
router.post('/crash-reports', crashReports.controller.recordCrash);

// 4. System Lock/Unlock
router.get('/system-lock', systemLock.controller.getStatus);
router.get('/lock-state', systemLock.controller.getStatus);
router.post('/system-lock', sensitiveOpLimiter, systemLock.controller.lock);
router.post('/lock-state', sensitiveOpLimiter, developerController.lockSystem);
router.post('/system-unlock', sensitiveOpLimiter, systemLock.controller.unlock);

// 5. Subscription Control
router.get('/subscriptions', subscriptionControl.controller.getSubscription);
router.get('/subscriptions/audit', developerController.checkSubscriptions);
router.post('/subscriptions', sensitiveOpLimiter, subscriptionControl.controller.updateSubscription);

// 6. Deployment History
router.get('/deployments', deploymentHistory.controller.getDeployments);
router.post('/deployments', sensitiveOpLimiter, deploymentHistory.controller.recordDeployment);

// 7. Logs
router.get('/logs', developerController.getLogs);

// 8. Live Performance Telemetry (Zero hardcoded metrics)
router.get('/performance', developerController.getPerformance);

// 9. Backup/Restore
router.get('/backups', backupRestore.controller.getBackups);
router.post('/backups', sensitiveOpLimiter, backupRestore.controller.createBackup);
router.post('/backups/:id/restore', sensitiveOpLimiter, backupRestore.controller.restoreBackup);

// 10. Disaster Recovery
router.get('/recovery', recovery.controller.getPlan);
router.post('/recovery/failover', sensitiveOpLimiter, recovery.controller.triggerFailover);

// 11. Security Alerts
router.get('/security-alerts', securityAlerts.controller.getAlerts);
router.post('/security-alerts', securityAlerts.controller.triggerAlert);
router.post('/security-alerts/:id/resolve', securityAlerts.controller.resolveAlert);

// 12. Tenant Management & Institutional Approval Authority
router.get('/tenants', tenantManagement.controller.getTenants);
router.get('/tenants/pending', tenantManagement.controller.getPendingTenants);
router.get('/tenants/:id', tenantManagement.controller.getTenantById);
router.post('/tenants', sensitiveOpLimiter, tenantManagement.controller.createTenant);
router.post('/tenants/:id/approve', sensitiveOpLimiter, tenantManagement.controller.approveTenant);
router.post('/tenants/:id/reject', sensitiveOpLimiter, tenantManagement.controller.rejectTenant);
router.post('/tenants/:id/lock', sensitiveOpLimiter, tenantManagement.controller.lockTenant);
router.post('/tenants/:id/renew', sensitiveOpLimiter, tenantManagement.controller.renewTenant);

// 13. Developer <-> Tenant Broadcast & Direct Messaging
router.get('/messages', developerController.getMessages);
router.post('/messages', developerController.sendMessage);

module.exports = router;
