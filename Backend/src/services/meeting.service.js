const zoomService = require('../integrations/zoom.service');
const { prisma } = require('../config/database');
const { emitToTenant } = require('../config/socket');
const { NotFoundError, AuthorizationError, ValidationError } = require('../utils/errors');

const MEETING_ORGANIZER_ROLES = new Set([
  'COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT', 'BOARD_EXECUTIVE',
  'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'MANAGER', 'HUMAN_RESOURCE',
]);

const EXECUTIVE_ROLES = [
  'COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT', 'BOARD_EXECUTIVE',
  'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'MANAGER',
  'FINANCE_MANAGER', 'ACCOUNTANT', 'TREASURY', 'HUMAN_RESOURCE',
  'LEGAL_DEPARTMENT', 'COMPLIANCE', 'INTERNAL_AUDIT', 'RISK_MANAGEMENT',
];

async function getAll(tenantId = null) {
  const where = { status: { not: 'CANCELLED' } };
  if (tenantId) where.tenantId = tenantId;
  return prisma.zoomMeeting.findMany({
    where,
    orderBy: { startTime: 'asc' },
  });
}

async function create(hostUser, data, tenantId = null) {
  const hostId = typeof hostUser === 'string' ? hostUser : hostUser?.id;
  const host = typeof hostUser === 'object' && hostUser
    ? hostUser
    : await prisma.user.findUnique({ where: { id: hostId } });

  if (!host) throw new NotFoundError('Host user account');
  if (!MEETING_ORGANIZER_ROLES.has(String(host.role || '').toUpperCase())) {
    throw new AuthorizationError('Only Company Owner, Branch Manager, or Executives may schedule online meetings.');
  }

  const topic = String(data.topic || data.title || '').trim();
  const startTimeRaw = data.startTime || data.scheduledAt || new Date(Date.now() + 3600000).toISOString();
  const duration = Math.max(15, parseInt(data.duration || 45, 10));
  if (!topic || topic.length < 3) {
    throw new ValidationError('Meeting topic/title must be at least 3 characters.');
  }

  const resolvedTenantId = tenantId || data.tenantId || host.tenantId || null;
  const audienceType = String(data.audienceType || data.targetScope || 'ALL_STAFF').toUpperCase();
  const selectedIds = Array.isArray(data.participantUserIds) ? data.participantUserIds : [];

  let invitedUsers = [];
  if (resolvedTenantId) {
    if (audienceType === 'SELECTED_PARTICIPANTS' && selectedIds.length > 0) {
      invitedUsers = await prisma.user.findMany({
        where: { tenantId: resolvedTenantId, status: 'ACTIVE', id: { in: selectedIds } },
        select: { id: true, firstName: true, lastName: true, role: true, email: true },
      });
    } else if (audienceType === 'EXECUTIVES_ONLY') {
      invitedUsers = await prisma.user.findMany({
        where: { tenantId: resolvedTenantId, status: 'ACTIVE', role: { in: EXECUTIVE_ROLES } },
        select: { id: true, firstName: true, lastName: true, role: true, email: true },
      });
    } else {
      invitedUsers = await prisma.user.findMany({
        where: {
          tenantId: resolvedTenantId,
          status: 'ACTIVE',
          role: { notIn: ['MEMBER', 'MEMBER_PORTAL', 'GUARANTOR', 'GUARANTOR_PORTAL'] },
        },
        select: { id: true, firstName: true, lastName: true, role: true, email: true },
      });
    }
  }

  const zoomMeeting = await zoomService.createMeeting({
    topic,
    startTime: startTimeRaw,
    duration,
    password: data.password,
  });

  const hostName = `${host.firstName || ''} ${host.lastName || ''}`.trim() || host.email;
  const meeting = await prisma.zoomMeeting.create({
    data: {
      tenantId: resolvedTenantId,
      zoomMeetingId: zoomMeeting.id,
      topic,
      hostId: host.id,
      hostName,
      targetScope: audienceType,
      participantRoles: audienceType === 'EXECUTIVES_ONLY' ? EXECUTIVE_ROLES : null,
      startTime: new Date(startTimeRaw),
      duration,
      joinUrl: zoomMeeting.join_url,
      password: data.password || null,
      participants: invitedUsers.map((u) => ({
        userId: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        role: u.role,
      })),
    },
  });

  if (invitedUsers.length > 0) {
    await Promise.all(
      invitedUsers.map((u) =>
        prisma.notification.create({
          data: {
            tenantId: resolvedTenantId,
            userId: u.id,
            type: 'IN_APP',
            category: 'MEETING_INVITE',
            title: `Online Meeting: ${topic}`,
            message: `${hostName} (${host.role}) scheduled an online meeting for ${new Date(startTimeRaw).toLocaleString()}. Join link: ${zoomMeeting.join_url}`,
            recipient: u.email || u.id,
            status: 'SENT',
            sentAt: new Date(),
            metadata: { meetingId: meeting.id, joinUrl: zoomMeeting.join_url, audienceType },
          },
        })
      )
    ).catch(() => { });
  }

  if (resolvedTenantId) {
    emitToTenant(resolvedTenantId, 'meeting:scheduled', {
      id: meeting.id,
      topic: meeting.topic,
      hostName,
      targetScope: audienceType,
      startTime: meeting.startTime,
      joinUrl: meeting.joinUrl,
      invitedCount: invitedUsers.length,
    });
  }

  return meeting;
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
