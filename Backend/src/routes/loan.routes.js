const express = require('express');
const loanController = require('../controllers/loan.controller');
const { authenticate } = require('../middleware/auth');
const { staffAndAbove, authorize, managerOnly, requireCapability } = require('../middleware/rbac');
const { require2FA } = require('../middleware/twoFactor');
const { validate } = require('../middleware/validate');
const { transactionLimiter } = require('../middleware/rateLimiter');
const { loanSchemas } = require('../validators');

const router = express.Router();

const loanReviewers = authorize(
  'COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT',
  'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'MANAGER',
  'LOAN_OFFICER', 'SENIOR_CREDIT_OFFICER', 'CREDIT_ANALYST', 'LOAN_UNDERWRITER', 'RISK_MANAGEMENT'
);
const loanApprovers = authorize(
  'COMPANY_OWNER', 'BOARD_EXECUTIVE', 'EXECUTIVE_MANAGEMENT',
  'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'MANAGER',
  'SENIOR_CREDIT_OFFICER', 'LOAN_UNDERWRITER', 'CREDIT_ANALYST',
  'FINANCE_MANAGER', 'TREASURY', 'ACCOUNTANT', 'RISK_MANAGEMENT'
);
const loanDisbursers = authorize(
  'COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT',
  'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'MANAGER',
  'FINANCE_MANAGER', 'TREASURY', 'ACCOUNTANT'
);

router.post('/apply', authenticate, requireCapability('canApplyLoan'), transactionLimiter, validate(loanSchemas.apply), loanController.apply);
router.get('/', authenticate, staffAndAbove, loanController.getAll);
router.get('/my-loans', authenticate, loanController.getMyLoans);
router.get('/status-distribution', authenticate, staffAndAbove, loanController.getStatusDistribution);
router.get('/:id', authenticate, loanController.getById);
router.get('/:id/schedule', authenticate, loanController.getRepaymentSchedule);
router.get('/:id/workflow', authenticate, staffAndAbove, loanController.getWorkflowHistory);
router.put('/:id/review', authenticate, loanReviewers, validate(loanSchemas.review), loanController.review);
router.put('/:id/approve', authenticate, loanApprovers, transactionLimiter, require2FA, loanController.approve);
router.put('/:id/disburse', authenticate, loanDisbursers, transactionLimiter, require2FA, validate(loanSchemas.disburse), loanController.disburse);
router.put('/:id/close', authenticate, managerOnly, loanController.close);

module.exports = router;
