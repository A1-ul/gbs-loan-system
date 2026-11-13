const videoService = require('./video.service');
const logger = require('../../utils/logger');

async function createMeeting(req, res, next) {
  try {
    const hostId = req.user.id;
    const { topic, startTime, duration, participants } = req.body;

    const meeting = await videoService.scheduleVideoMeeting(
      hostId,
      topic,
      startTime || new Date(),
      duration,
      participants
    );

    return res.status(201).json({
      success: true,
      message: 'Video meeting scheduled successfully',
      data: meeting,
    });
  } catch (error) {
    logger.error('Error creating video meeting:', error);
    next(error);
  }
}

async function getMeetings(req, res, next) {
  try {
    const userId = req.user.id;
    const meetings = await videoService.listUserMeetings(userId);
    return res.status(200).json({ success: true, data: meetings });
  } catch (error) {
    logger.error('Error listing meetings:', error);
    next(error);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { meetingId } = req.params;
    const { status } = req.body;

    const updated = await videoService.updateMeetingStatus(meetingId, status);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating meeting status:', error);
    next(error);
  }
}

module.exports = {
  createMeeting,
  getMeetings,
  updateStatus,
};
