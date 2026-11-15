/**
 * GBS LOAN MANAGEMENT SYSTEM - USER REGISTRATION COUNT & VERIFICATION ROUTES
 * Standard: Node.js CommonJS
 */

const express = require('express');
const userCountController = require('../controllers/userCount.controller');
const { authenticate } = require('../../../middleware/auth');
const { authorize } = require('../../../middleware/rbac');
const { ROLES } = require('../../../constants/roles');

const router = express.Router();

const countViewerRoles = [
  ROLES.COMPANY_OWNER,
  ROLES.BOARD_EXECUTIVE,
  ROLES.EXECUTIVE_MANAGEMENT,
  ROLES.REGIONAL_MANAGER,
  ROLES.BRANCH_MANAGER,
  ROLES.OPERATIONS_MANAGER,
  ROLES.MANAGER,
  ROLES.INTERNAL_AUDIT,
  ROLES.COMPLIANCE,
  ROLES.RISK_MANAGEMENT,
  ROLES.FRAUD_INVESTIGATION,
  ROLES.SECURITY_OPERATIONS,
  ROLES.HUMAN_RESOURCE,
];

/**
 * Authorized dropdown count endpoints (STRICTLY authenticated, never globally unauthenticated):
 */
router.get('/counts-by-role', authenticate, authorize(countViewerRoles), userCountController.getCountsByRole);
router.get('/counts', authenticate, authorize(countViewerRoles), userCountController.getCountsByRole);

/**
 * Admin Cross-Check & Verification Endpoints:
 * Protected: Requires Administrator/Management permissions
 */
router.get(
  '/by-role/:role',
  authenticate,
  authorize([
    ROLES.COMPANY_OWNER,
    ROLES.BOARD_EXECUTIVE,
    ROLES.EXECUTIVE_MANAGEMENT,
    ROLES.REGIONAL_MANAGER,
    ROLES.BRANCH_MANAGER,
    ROLES.OPERATIONS_MANAGER,
    ROLES.MANAGER,
    ROLES.INTERNAL_AUDIT,
    ROLES.COMPLIANCE,
    ROLES.RISK_MANAGEMENT,
    ROLES.FRAUD_INVESTIGATION,
    ROLES.SECURITY_OPERATIONS,
    ROLES.HUMAN_RESOURCE,
  ]),
  userCountController.getUsersByRole
);

router.post(
  '/:id/verify-qualification',
  authenticate,
  authorize([
    ROLES.COMPANY_OWNER,
    ROLES.EXECUTIVE_MANAGEMENT,
    ROLES.BRANCH_MANAGER,
    ROLES.HUMAN_RESOURCE,
  ]),
  userCountController.verifyQualification
);

router.delete(
  '/:id/remove-unqualified',
  authenticate,
  authorize([
    ROLES.COMPANY_OWNER,
  ]),
  userCountController.removeUnqualifiedUser
);

router.get(
  '/registration-alerts',
  authenticate,
  authorize([
    ROLES.COMPANY_OWNER,
    ROLES.EXECUTIVE_MANAGEMENT,
    ROLES.BRANCH_MANAGER,
    ROLES.HUMAN_RESOURCE,
    ROLES.COMPLIANCE,
  ]),
  userCountController.getRegistrationAlerts
);

module.exports = router;
