const express = require('express');
const meetingController = require('../controllers/meeting.controller');
const { authenticate } = require('../middleware/auth');
const { staffAndAbove } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { meetingSchemas } = require('../validators');

const router = express.Router();

router.get('/', authenticate, staffAndAbove, meetingController.getAll);
router.post('/', authenticate, staffAndAbove, validate(meetingSchemas.create), meetingController.create);
router.get('/:id', authenticate, meetingController.getById);
router.delete('/:id', authenticate, meetingController.cancel);

module.exports = router;
