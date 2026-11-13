const express = require('express');
const loanController = require('../controllers/loan.controller');
const { authenticate } = require('../middleware/auth');
const { staffAndAbove, accountantAndAbove, memberOnly, managerOnly } = require('../middleware/rbac');
const { require2FA } = require('../middleware/twoFactor');
const { validate } = require('../middleware/validate');
const { transactionLimiter } = require('../middleware/rateLimiter');
const { loanSchemas } = require('../validators');

const router = express.Router();

router.post('/apply', authenticate, transactionLimiter, validate(loanSchemas.apply), loanController.apply);
router.get('/', authenticate, staffAndAbove, loanController.getAll);
router.get('/my-loans', authenticate, loanController.getMyLoans);
router.get('/status-distribution', authenticate, staffAndAbove, loanController.getStatusDistribution);
router.get('/:id', authenticate, loanController.getById);
router.get('/:id/schedule', authenticate, loanController.getRepaymentSchedule);
router.get('/:id/workflow', authenticate, staffAndAbove, loanController.getWorkflowHistory);
router.put('/:id/review', authenticate, staffAndAbove, validate(loanSchemas.review), loanController.review);
router.put('/:id/approve', authenticate, accountantAndAbove, transactionLimiter, require2FA, loanController.approve);
router.put('/:id/disburse', authenticate, accountantAndAbove, transactionLimiter, require2FA, validate(loanSchemas.disburse), loanController.disburse);
router.put('/:id/close', authenticate, managerOnly, loanController.close);

module.exports = router;
