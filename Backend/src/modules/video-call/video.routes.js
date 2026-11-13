const express = require('express');
const videoController = require('./video.controller');
const { authenticateJwt } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticateJwt);

router.post('/schedule', videoController.createMeeting);
router.get('/', videoController.getMeetings);
router.patch('/:meetingId/status', videoController.updateStatus);

module.exports = router;
