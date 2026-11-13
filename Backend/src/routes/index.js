const express = require('express');
const authRoutes = require('./auth.routes');
const memberRoutes = require('./member.routes');
const guarantorRoutes = require('./guarantor.routes');
const loanRoutes = require('./loan.routes');
const paymentRoutes = require('./payment.routes');
const staffRoutes = require('./staff.routes');
const collectorRoutes = require('./collector.routes');
const gpsRoutes = require('./gps.routes');
const notificationRoutes = require('./notification.routes');
const salaryRoutes = require('./salary.routes');
const reportRoutes = require('./report.routes');
const dashboardRoutes = require('./dashboard.routes');
const meetingRoutes = require('./meeting.routes');
const systemRoutes = require('./system.routes');
const auditRoutes = require('./audit.routes');

// Master Subsystem Modules
const { voiceRoutes } = require('../modules/voice-auth');
const faceRoutes = require('../modules/facial-recognition/face.routes');
const { salaryGroupingRoutes } = require('../modules/human-resources');
const { developerRoutes } = require('../modules/developer-platform');
const { assistantRoutes } = require('../modules/ai-developer');
const { migrationRoutes } = require('../modules/migration');
const { tenantRoutes } = require('../modules/tenant');
const { enterpriseRoutes } = require('../modules/enterprise');
const userCountRoutes = require('../modules/administration/routes/userCount.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gbs-loan-api', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/users', userCountRoutes);
router.use('/members', memberRoutes);
router.use('/guarantors', guarantorRoutes);
router.use('/loans', loanRoutes);
router.use('/payments', paymentRoutes);
router.use('/staff', staffRoutes);
router.use('/collectors', collectorRoutes);
router.use('/gps', gpsRoutes);
router.use('/notifications', notificationRoutes);
router.use('/salaries', salaryRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/meetings', meetingRoutes);
router.use('/system', systemRoutes);
router.use('/audit-logs', auditRoutes);

// Blueprint & Subsystem Endpoints
router.use('/tenants', tenantRoutes);
router.use('/voice-auth', voiceRoutes);
router.use('/facial-recognition', faceRoutes);
router.use('/enterprise', enterpriseRoutes);
router.use('/hr/salary-grouping', salaryGroupingRoutes);
router.use('/developer', developerRoutes);
router.use('/ai-developer', assistantRoutes);
router.use('/migration', migrationRoutes);

module.exports = router;
