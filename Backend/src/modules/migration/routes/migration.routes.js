const express = require('express');
const migrationController = require('../controllers/migration.controller');
const { authenticate } = require('../../../middleware/auth');
const { managementAndAbove } = require('../../../middleware/rbac');
const { uploadMigrationFile } = require('../../../middleware/upload');

const router = express.Router();

router.use(authenticate);
router.use(managementAndAbove);

router.get('/status', (req, res) => {
  res.json({
    success: true,
    engine: 'GBS Enterprise Data Migration Engine (PostgreSQL + Bull Queue)',
    status: 'READY',
    timestamp: new Date().toISOString(),
  });
});

router.post('/upload', uploadMigrationFile.single('file'), migrationController.uploadAndAnalyze);
router.post('/jobs', migrationController.createJob);
router.post('/jobs/:jobId/process', migrationController.processBatch);
router.post('/jobs/:jobId/rollback', migrationController.rollbackJob);
router.get('/jobs/:jobId', migrationController.getJob);
router.get('/jobs', migrationController.listJobs);

module.exports = router;
