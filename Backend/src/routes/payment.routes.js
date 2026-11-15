const express = require('express');
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth');
const { staffAndAbove, authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { transactionLimiter } = require('../middleware/rateLimiter');
const { paymentSchemas } = require('../validators');

const router = express.Router();

const cashApprovers = authorize(
  'SUPER_ADMIN', 'COMPANY_OWNER', 'FINANCE_MANAGER', 'TREASURY', 'ACCOUNTANT',
  'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'REGIONAL_MANAGER', 'MANAGER'
);

router.post('/', authenticate, transactionLimiter, validate(paymentSchemas.create), paymentController.create);
router.get('/', authenticate, staffAndAbove, paymentController.getAll);
router.get('/monthly-trends', authenticate, staffAndAbove, paymentController.getMonthlyTrends);
router.get('/:id', authenticate, paymentController.getById);
router.put('/:id/approve-cash', authenticate, cashApprovers, validate(paymentSchemas.approveCash), paymentController.approveCash);
router.post('/:id/approve-cash', authenticate, cashApprovers, validate(paymentSchemas.approveCash), paymentController.approveCash);
router.post('/momo/initiate', authenticate, transactionLimiter, paymentController.initiateMoMo);
router.post('/momo/callback', paymentController.momoCallback);
router.post('/momo/status/:ref', authenticate, paymentController.checkMoMoStatus);

module.exports = router;
