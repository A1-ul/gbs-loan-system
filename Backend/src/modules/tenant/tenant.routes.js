const express = require('express');
const tenantController = require('./tenant.controller');
const { authenticate } = require('../../middleware/auth');
const { managementAndAbove } = require('../../middleware/rbac');
const { upload } = require('../../middleware/upload');

const router = express.Router();

// Public Institutional Onboarding, Subscription Plans & Safe Active Directory
router.post('/onboard', tenantController.submitOnboarding);
router.get('/onboarding-status/:identifier', tenantController.checkOnboardingStatus);
router.get('/public-directory', tenantController.getPublicDirectory);
router.get('/subscription-plans', tenantController.getSubscriptionCatalog);

// Authenticated Tenant Self-Service (strictly scoped to caller's tenantId)
router.use(authenticate);
router.get('/my/countdown', tenantController.getMyCountdown);
router.get('/my/messages', tenantController.getMyMessages);
router.get('/my/profile', tenantController.getMyProfile);
router.put('/my/branding', upload.single('logo'), tenantController.updateMyBranding);
router.post('/my/subscription', tenantController.selectMySubscriptionPlan);

router.get('/', managementAndAbove, tenantController.getAllTenants);
router.get('/:id', managementAndAbove, tenantController.getTenantById);
router.put('/:id', managementAndAbove, tenantController.updateTenant);

// Branch Management Routes (Tenant Admin / Manager within their own institution)
router.get('/:id/branches', managementAndAbove, tenantController.getBranches);
router.post('/:id/branches', managementAndAbove, tenantController.createBranch);
router.put('/:id/branches/:branchId', managementAndAbove, tenantController.updateBranch);
router.delete('/:id/branches/:branchId', managementAndAbove, tenantController.deleteBranch);

module.exports = router;
