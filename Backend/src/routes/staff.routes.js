const express = require('express');
const staffController = require('../controllers/staff.controller');
const { authenticate } = require('../middleware/auth');
const { managerOnly, staffAndAbove } = require('../middleware/rbac');

const router = express.Router();

router.get('/', authenticate, staffAndAbove, staffController.getAll);
router.get('/:id', authenticate, staffController.getById);
router.post('/', authenticate, managerOnly, staffController.create);
router.put('/:id', authenticate, managerOnly, staffController.update);
router.delete('/:id', authenticate, managerOnly, staffController.deactivate);

module.exports = router;
