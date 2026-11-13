const express = require('express');
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth');
const { staffAndAbove } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { reportSchemas } = require('../validators');

const router = express.Router();

router.get('/', authenticate, staffAndAbove, reportController.getReportsOverview);
router.post('/generate', authenticate, staffAndAbove, validate(reportSchemas.generate), reportController.generate);
router.get('/loan', authenticate, staffAndAbove, reportController.loanReport);
router.get('/payment', authenticate, staffAndAbove, reportController.paymentReport);
router.get('/collection', authenticate, staffAndAbove, reportController.collectionReport);
router.get('/staff', authenticate, staffAndAbove, reportController.staffReport);
router.get('/guarantor', authenticate, staffAndAbove, reportController.guarantorReport);
router.get('/outstanding', authenticate, staffAndAbove, reportController.outstandingReport);

module.exports = router;
