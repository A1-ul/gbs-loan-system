const express = require('express');
const { authenticate } = require('../../middleware/auth');
const enterpriseCtrl = require('../../modules/enterprise/enterprise.controller');

const router = express.Router();
router.use(authenticate);

// Delegates directly to PostgreSQL-backed Enterprise Operations Controller
router.get('/cases', enterpriseCtrl.getComplianceCases);
router.post('/cases', enterpriseCtrl.createComplianceCase);
router.get('/tickets', enterpriseCtrl.getSupportTickets);
router.post('/tickets', enterpriseCtrl.createSupportTicket);
router.get('/documents', enterpriseCtrl.getDocuments);
router.get('/products', enterpriseCtrl.getLoanProducts);

module.exports = router;
