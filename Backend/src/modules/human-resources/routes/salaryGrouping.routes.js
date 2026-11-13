const express = require('express');
const salaryGroupingController = require('../controllers/salaryGrouping.controller');
const { authenticateJwt } = require('../../../middleware/auth');
const { requireRole } = require('../../../middleware/rbac');

const router = express.Router();

router.use(authenticateJwt);

router.get('/profile/:staffId', requireRole(['HUMAN_RESOURCE', 'ACCOUNTANT', 'MANAGER']), salaryGroupingController.getSalaryProfile);
router.post('/profile/:staffId', requireRole(['HUMAN_RESOURCE', 'MANAGER']), salaryGroupingController.upsertSalaryProfile);
router.post('/seed-defaults', requireRole(['HUMAN_RESOURCE', 'MANAGER']), salaryGroupingController.seedDefaults);

module.exports = router;
