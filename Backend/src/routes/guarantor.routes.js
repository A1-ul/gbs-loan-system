const express = require('express');
const guarantorController = require('../controllers/guarantor.controller');
const { authenticate } = require('../middleware/auth');
const { staffAndAbove } = require('../middleware/rbac');

const router = express.Router();

router.get('/', authenticate, staffAndAbove, guarantorController.getAll);
router.post('/', authenticate, staffAndAbove, guarantorController.create);
router.get('/my-guarantees', authenticate, guarantorController.getMyGuarantees);
router.get('/:id', authenticate, guarantorController.getById);
router.get('/:id/loans', authenticate, guarantorController.getLoansByGuarantor);
router.post('/:id/sign-agreement', authenticate, guarantorController.signAgreement);
router.put('/:id/penalty-notifications', authenticate, guarantorController.togglePenaltyNotifications);

module.exports = router;
