const express = require('express');
const auditController = require('../controllers/audit.controller');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { ROLES } = require('../constants');

const router = express.Router();

const auditViewAuthorized = authorize(
  ROLES.SUPER_ADMIN,
  ROLES.COMPANY_OWNER,
  ROLES.BOARD_EXECUTIVE,
  ROLES.EXECUTIVE_MANAGEMENT,
  ROLES.OPERATIONS_MANAGER,
  ROLES.BRANCH_MANAGER,
  ROLES.MANAGER,
  ROLES.INTERNAL_AUDIT,
  ROLES.COMPLIANCE,
  ROLES.RISK_MANAGEMENT,
  ROLES.FRAUD_INVESTIGATION,
  ROLES.SECURITY_OPERATIONS
);

router.get('/', authenticate, auditViewAuthorized, auditController.getAll);
router.get('/export', authenticate, auditViewAuthorized, auditController.getAll);
router.get('/:id', authenticate, auditViewAuthorized, auditController.getById);
router.get('/entity/:type/:id', authenticate, auditViewAuthorized, auditController.getByEntity);

module.exports = router;
