const express = require('express');
const salaryController = require('../controllers/salary.controller');
const { authenticate } = require('../middleware/auth');
const { managerOnly, requireCapability } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { salarySchemas } = require('../validators');

const router = express.Router();

router.get('/', authenticate, requireCapability('canViewSalaries'), salaryController.getAll);
router.get('/summary', authenticate, managerOnly, salaryController.getSummary);
router.post('/', authenticate, managerOnly, validate(salarySchemas.create), salaryController.create);
router.put('/:id/pay', authenticate, managerOnly, validate(salarySchemas.pay), salaryController.processPayment);

module.exports = router;
