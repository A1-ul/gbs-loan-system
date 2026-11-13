const express = require('express');
const collectorController = require('../controllers/collector.controller');
const { authenticate } = require('../middleware/auth');
const { staffAndAbove, collectorOnly } = require('../middleware/rbac');

const router = express.Router();

router.get('/', authenticate, staffAndAbove, collectorController.getAll);
router.get('/live', authenticate, staffAndAbove, collectorController.getLiveLocations);
router.get('/:id', authenticate, collectorController.getById);
router.get('/:id/history', authenticate, staffAndAbove, collectorController.getLocationHistory);
router.put('/:id/status', authenticate, collectorOnly, collectorController.updateStatus);

module.exports = router;
