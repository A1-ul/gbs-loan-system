const { prisma } = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * Schedule a Video Call with Tenant
 */
async function scheduleVideoMeeting(hostId, topic, startTime, duration = 30, participants = []) {
  const meetingId = `ZOOM-${Math.floor(100000 + Math.random() * 900000)}`;
  const joinUrl = `https://zoom.gbs.com/j/${meetingId}`;

  const meeting = await prisma.zoomMeeting.create({
    data: {
      zoomMeetingId: meetingId,
      topic: topic || 'Tenant Loan Interview & Video Verification',
      hostId,
      startTime: new Date(startTime),
      duration: Number(duration),
      joinUrl,
      password: Math.random().toString(36).slice(-6),
      status: 'SCHEDULED',
      participants,
    },
  });

  logger.info(`Video meeting scheduled successfully: ${meeting.zoomMeetingId}`);
  return meeting;
}

/**
 * List Video Meetings for User
 */
async function listUserMeetings(userId) {
  return await prisma.zoomMeeting.findMany({
    where: {
      OR: [
        { hostId: userId },
      ],
    },
    orderBy: { startTime: 'desc' },
  });
}

/**
 * Update Meeting Status (IN_PROGRESS, COMPLETED, CANCELLED)
 */
async function updateMeetingStatus(meetingId, status) {
  return await prisma.zoomMeeting.update({
    where: { zoomMeetingId: meetingId },
    data: { status },
  });
}

module.exports = {
  scheduleVideoMeeting,
  listUserMeetings,
  updateMeetingStatus,
};
