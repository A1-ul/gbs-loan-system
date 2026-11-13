const express = require('express');
const gpsController = require('../controllers/gps.controller');
const { authenticate } = require('../middleware/auth');
const { collectorOnly, staffAndAbove } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { gpsSchemas } = require('../validators');

const router = express.Router();

router.post('/location', authenticate, collectorOnly, validate(gpsSchemas.updateLocation), gpsController.updateLocation);
router.post('/sync', authenticate, collectorOnly, validate(gpsSchemas.batchSync), gpsController.batchSync);
router.get('/tracking/:collectorId', authenticate, staffAndAbove, gpsController.getTrackingData);
router.post('/consent', authenticate, gpsController.grantConsent);
router.delete('/consent', authenticate, gpsController.revokeConsent);

module.exports = router;
