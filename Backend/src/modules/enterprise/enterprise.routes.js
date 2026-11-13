const express = require('express');
const ctrl = require('./enterprise.controller');
const { authenticate } = require('../../middleware/auth');
const { staffAndAbove, managementAndAbove, creditTeam, financeTeam, securityAndAudit, fieldTeam, authorize } = require('../../middleware/rbac');
const { upload } = require('../../middleware/upload');

const router = express.Router();

router.use(authenticate);

// Loan Products & Collateral
router.get('/loan-products', ctrl.getLoanProducts);
router.post('/loan-products', managementAndAbove, ctrl.createLoanProduct);
router.get('/collateral', staffAndAbove, ctrl.getCollaterals);
router.post('/collateral', creditTeam, ctrl.createCollateral);

// Field Customer Visits
router.get('/visits', staffAndAbove, ctrl.getCustomerVisits);
router.post('/visits', authorize('SUPER_ADMIN', 'COMPANY_OWNER', 'COLLECTIONS', 'FIELD_OFFICER', 'STAFF', 'MOBILE_STAFF', 'COLLECTOR', 'LOAN_OFFICER', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'MANAGER'), ctrl.recordCustomerVisit);

// Compliance, Audit, Fraud, Risk & Legal Cases
router.get('/compliance-cases', staffAndAbove, ctrl.getComplianceCases);
router.post('/compliance-cases', authorize('SUPER_ADMIN', 'COMPANY_OWNER', 'INTERNAL_AUDIT', 'COMPLIANCE', 'FRAUD_INVESTIGATION', 'SECURITY_OPERATIONS', 'RISK_MANAGEMENT', 'LEGAL_DEPARTMENT', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'REGIONAL_MANAGER', 'EXECUTIVE_MANAGEMENT', 'BOARD_EXECUTIVE'), ctrl.createComplianceCase);
router.put('/compliance-cases/:id', authorize('SUPER_ADMIN', 'COMPANY_OWNER', 'INTERNAL_AUDIT', 'COMPLIANCE', 'FRAUD_INVESTIGATION', 'SECURITY_OPERATIONS', 'RISK_MANAGEMENT', 'LEGAL_DEPARTMENT', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'REGIONAL_MANAGER', 'EXECUTIVE_MANAGEMENT', 'BOARD_EXECUTIVE'), ctrl.updateComplianceCase);

// Customer Service & Reception Tickets
router.get('/support-tickets', staffAndAbove, ctrl.getSupportTickets);
router.post('/support-tickets', staffAndAbove, ctrl.createSupportTicket);
router.put('/support-tickets/:id', staffAndAbove, ctrl.updateSupportTicket);

// Investors & Marketing
router.get('/investors', staffAndAbove, ctrl.getInvestors);
router.post('/investors', financeTeam, ctrl.createInvestor);
router.get('/campaigns', staffAndAbove, ctrl.getCampaigns);
router.post('/campaigns', staffAndAbove, ctrl.createCampaign);

// KYC / Contract Document Vault
router.get('/documents', staffAndAbove, ctrl.getDocuments);
router.post('/documents', staffAndAbove, upload.single('file'), ctrl.createDocument);

// Manager Deletion Approval Queue
router.get('/deletion-requests', managementAndAbove, ctrl.getDeletionRequests);
router.put('/deletion-requests/:id', managementAndAbove, ctrl.reviewDeletionRequest);

// HR Monthly Payroll Generation
router.post('/hr/payroll/generate', authorize('SUPER_ADMIN', 'COMPANY_OWNER', 'HUMAN_RESOURCE', 'FINANCE_MANAGER', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'MANAGER'), ctrl.generateMonthlyPayroll);

// Live Database Report Exports (CSV, XLSX, PDF)
router.get('/reports/export/:type', staffAndAbove, ctrl.exportReport);

module.exports = router;
