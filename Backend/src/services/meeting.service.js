const zoomService = require('../integrations/zoom.service');
const { prisma } = require('../config/database');
const { NotFoundError } = require('../utils/errors');

async function getAll(tenantId = null) {
  const where = { status: { not: 'CANCELLED' } };
  if (tenantId) where.tenantId = tenantId;
  return prisma.zoomMeeting.findMany({
    where,
    orderBy: { startTime: 'asc' },
  });
}

async function create(hostId, data, tenantId = null) {
  const zoomMeeting = await zoomService.createMeeting({
    topic: data.topic,
    startTime: data.startTime,
    duration: data.duration,
    password: data.password,
  });

  return prisma.zoomMeeting.create({
    data: {
      tenantId: tenantId || data.tenantId || null,
      zoomMeetingId: zoomMeeting.id,
      topic: data.topic,
      hostId,
      startTime: new Date(data.startTime),
      duration: data.duration,
      joinUrl: zoomMeeting.join_url,
      password: data.password,
    },
  });
}

async function getById(id) {
  const meeting = await prisma.zoomMeeting.findUnique({ where: { id } });
  if (!meeting) throw new NotFoundError('Meeting');
  return meeting;
}

async function cancel(id) {
  const meeting = await getById(id);
  await zoomService.cancelMeeting(meeting.zoomMeetingId);
  return prisma.zoomMeeting.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });
}

module.exports = { getAll, create, getById, cancel };
