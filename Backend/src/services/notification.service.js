/**
 * Notification Queue, Real-Time SMS/Email Dispatch, Staff Broadcasts & Collection Alerts
 */
const { prisma } = require('../config/database');
const { getNotificationQueue } = require('../queues/notification.queue');
const smsService = require('../integrations/sms.service');
const emailService = require('../integrations/email.service');
const { emitToTenant } = require('../config/socket');
const { AuthorizationError, ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

const VALID_NOTIFICATION_CATEGORIES = new Set([
  'PAYMENT_REMINDER',
  'PAYMENT_DUE_TODAY',
  'PAYMENT_DUE_WEEK',
  'OVERDUE_ALERT',
  'GUARANTOR_ALERT',
  'LOAN_APPROVED',
  'LOAN_DISBURSED',
  'LOAN_REJECTED',
  'OTP_VERIFICATION',
  'SYSTEM_ALERT',
  'MEETING_INVITE',
  'TENANT_APPROVAL',
  'TRIAL_COUNTDOWN',
]);

function normalizeNotificationCategory(raw) {
  const upper = String(raw || 'SYSTEM_ALERT').toUpperCase();
  if (VALID_NOTIFICATION_CATEGORIES.has(upper)) return upper;
  if (upper.includes('PAYMENT') || upper.includes('COLLECTION')) return 'PAYMENT_REMINDER';
  if (upper.includes('MEETING')) return 'MEETING_INVITE';
  if (upper.includes('LOAN')) return 'LOAN_APPROVED';
  if (upper.includes('OTP')) return 'OTP_VERIFICATION';
  return 'SYSTEM_ALERT';
}

const IMMEDIATE_SUBCATEGORIES = new Set([
  'OTP_VERIFICATION',
  'STAFF_BROADCAST',
  'PAYMENT_COLLECTION_ALERT',
  'PAYMENT_REMINDER',
  'LOAN_APPROVED',
  'LOAN_DISBURSED',
]);

async function deliverNow(notification) {
  let deliveryResult = { delivered: false, provider: 'NONE' };

  try {
    let isDemoNotification = Boolean(notification.metadata?.isDemo);
    if (!isDemoNotification && notification.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: notification.tenantId },
        select: { code: true },
      }).catch(() => null);
      isDemoNotification = tenant?.code === 'DEMO-SANDBOX';
    }

    if (isDemoNotification && (notification.type === 'SMS' || notification.type === 'EMAIL')) {
      deliveryResult = {
        delivered: true,
        simulated: true,
        provider: 'DEMO_SANDBOX_SIMULATED',
        note: 'External carrier SMS/Email skipped cleanly inside Demo Learning Mode.',
      };
    } else if (notification.type === 'SMS') {
      deliveryResult = await smsService.send(notification.recipient, notification.message);
    } else if (notification.type === 'EMAIL') {
      const res = await emailService.send(notification.recipient, notification.title, notification.message);
      deliveryResult = { delivered: !res?.mock, provider: res?.mock ? 'NONE_CONFIGURED' : 'smtp', response: res };
    } else {
      deliveryResult = { delivered: true, provider: 'IN_APP' };
    }

    const deliveredOk = deliveryResult?.delivered !== false;
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: deliveredOk ? 'SENT' : 'FAILED',
        sentAt: deliveredOk ? new Date() : null,
        errorMessage: deliveredOk ? null : (deliveryResult?.error || 'Gateway not configured'),
        metadata: {
          ...(notification.metadata || {}),
          deliveryResult,
        },
      },
    });
  } catch (error) {
    deliveryResult = { delivered: false, error: error.message };
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: 'FAILED',
        failedAt: new Date(),
        errorMessage: error.message,
        retryCount: { increment: 1 },
        metadata: {
          ...(notification.metadata || {}),
          deliveryResult,
        },
      },
    }).catch(() => { });
  }

  return deliveryResult;
}

async function queue(notification) {
  const rawCategory = String(notification.category || 'SYSTEM_ALERT').toUpperCase();
  const dbCategory = normalizeNotificationCategory(rawCategory);

  const record = await prisma.notification.create({
    data: {
      tenantId: notification.tenantId || null,
      userId: notification.userId,
      type: notification.type || 'PUSH',
      category: dbCategory,
      title: notification.title,
      message: notification.message,
      recipient: notification.recipient || notification.userId,
      metadata: {
        ...(notification.metadata || {}),
        subCategory: rawCategory,
      },
      status: 'QUEUED',
    },
  });

  const shouldDeliverImmediately =
    notification.immediate === true ||
    IMMEDIATE_SUBCATEGORIES.has(rawCategory) ||
    IMMEDIATE_SUBCATEGORIES.has(dbCategory);

  let deliveryResult = null;
  if (shouldDeliverImmediately) {
    deliveryResult = await deliverNow(record);
  } else {
    try {
      const bullQueue = getNotificationQueue();
      if (bullQueue) {
        await bullQueue.add('send', { notificationId: record.id }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }).catch(async (err) => {
          logger.warn(`Notification Queue dispatch warning: ${err.message} — falling back to immediate send`);
          deliveryResult = await deliverNow(record);
        });
      } else {
        deliveryResult = await deliverNow(record);
      }
    } catch (err) {
      logger.warn(`Notification Queue offline (${err.message}) — delivering synchronously`);
      deliveryResult = await deliverNow(record);
    }
  }

  return { ...record, deliveryResult };
}

async function processNotification(notificationId) {
  const record = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!record) return null;
  return deliverNow(record);
}

async function getByUserId(userId, limit = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

async function getQueueStatus() {
  const bullQueue = getNotificationQueue();
  if (!bullQueue) return { waiting: 0, active: 0, completed: 0, failed: 0, mode: 'immediate-in-process' };
  const [waiting, active, completed, failed] = await Promise.all([
    bullQueue.getWaitingCount().catch(() => 0),
    bullQueue.getActiveCount().catch(() => 0),
    bullQueue.getCompletedCount().catch(() => 0),
    bullQueue.getFailedCount().catch(() => 0),
  ]);

  return { waiting, active, completed, failed, mode: 'bullmq' };
}

async function markAsRead(id) {
  const existing = await prisma.notification.findUnique({ where: { id } });
  return prisma.notification.update({
    where: { id },
    data: { isRead: true, metadata: { ...(existing?.metadata || {}), read: true } },
  });
}

async function sendPaymentReminder({ loanId, type }) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { member: { include: { user: true } } },
  });
  if (!loan) throw new ValidationError('Loan not found for payment reminder');

  const categoryMap = {
    due_today: 'PAYMENT_DUE_TODAY',
    due_week: 'PAYMENT_DUE_WEEK',
    overdue: 'OVERDUE_ALERT',
  };

  return queue({
    immediate: true,
    tenantId: loan.tenantId,
    userId: loan.member.userId,
    type: 'SMS',
    category: categoryMap[type] || 'PAYMENT_REMINDER',
    title: 'Payment Reminder',
    message: `Reminder: Your loan ${loan.loanNumber} payment is due. Outstanding balance: GHS ${Number(loan.outstandingAmount || loan.totalAmount || 0).toFixed(2)}.`,
    recipient: loan.member.user.phone,
  });
}

function formatBroadcastDto(b) {
  return {
    ...b,
    title: b.subject,
    message: b.body,
    sendToAll: b.targetScope === 'ALL_STAFF',
  };
}

/**
 * Company Owner / Management sends broadcast or targeted message to All Staff or Selected Staff
 */
async function broadcastToStaff(senderUser, { tenantId = null, recipientUserIds = [], sendToAll, targetAll = false, title, subject, message, body, priority = 'NORMAL' } = {}) {
  const scopeTenantId = tenantId || senderUser?.tenantId || null;
  if (!scopeTenantId) throw new ValidationError('Institutional tenant context is required for staff messaging.');

  const allowedRoles = new Set([
    'COMPANY_OWNER', 'BOARD_EXECUTIVE', 'EXECUTIVE_MANAGEMENT',
    'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'MANAGER', 'HUMAN_RESOURCE',
  ]);
  if (!allowedRoles.has(String(senderUser?.role || '').toUpperCase())) {
    throw new AuthorizationError('Only Company Owner or Authorized Management may broadcast messages to staff.');
  }

  const finalSubject = String(title || subject || '').trim();
  const finalBody = String(message || body || '').trim();
  if (!finalSubject || !finalBody) {
    throw new ValidationError('Message title and content are required.');
  }

  const isBroadcastAll = Boolean(sendToAll ?? targetAll);
  if (!isBroadcastAll && (!Array.isArray(recipientUserIds) || recipientUserIds.length === 0)) {
    throw new ValidationError('Select at least one staff recipient or enable "Send to All Staff".');
  }

  const staffWhere = {
    tenantId: scopeTenantId,
    status: 'ACTIVE',
    role: { notIn: ['MEMBER', 'MEMBER_PORTAL', 'GUARANTOR', 'GUARANTOR_PORTAL'] },
    ...(!isBroadcastAll && Array.isArray(recipientUserIds) && recipientUserIds.length > 0
      ? { id: { in: recipientUserIds } }
      : {}),
  };

  const recipients = await prisma.user.findMany({
    where: staffWhere,
    select: { id: true, firstName: true, lastName: true, phone: true, email: true, role: true },
  });

  const senderName = `${senderUser.firstName || ''} ${senderUser.lastName || ''}`.trim() || senderUser.email;
  const senderRole = String(senderUser.role || 'COMPANY_OWNER');
  const targetIds = isBroadcastAll ? [] : recipients.map((r) => r.id);

  const broadcast = await prisma.staffBroadcastMessage.create({
    data: {
      tenantId: scopeTenantId,
      senderUserId: senderUser.id,
      senderName,
      senderRole,
      targetScope: isBroadcastAll ? 'ALL_STAFF' : 'SELECTED_STAFF',
      recipientUserIds: targetIds,
      subject: finalSubject,
      body: finalBody,
      priority: String(priority || 'NORMAL').toUpperCase(),
    },
  });

  await Promise.all(
    recipients.map((r) =>
      prisma.notification.create({
        data: {
          tenantId: scopeTenantId,
          userId: r.id,
          type: 'IN_APP',
          category: 'SYSTEM_ALERT',
          title: `[${senderName}] ${finalSubject}`,
          message: finalBody,
          recipient: r.phone || r.email || r.id,
          status: 'SENT',
          sentAt: new Date(),
          metadata: {
            subCategory: 'STAFF_BROADCAST',
            broadcastId: broadcast.id,
            sendToAll: Boolean(sendToAll),
            priority: broadcast.priority,
          },
        },
      })
    )
  );

  emitToTenant(scopeTenantId, 'staff:broadcast', {
    id: broadcast.id,
    title: finalSubject,
    message: finalBody,
    senderName,
    sendToAll: Boolean(sendToAll),
    recipientCount: recipients.length,
    createdAt: broadcast.createdAt,
  });

  return {
    broadcast: formatBroadcastDto(broadcast),
    recipientCount: recipients.length,
    recipients: recipients.map((r) => ({ id: r.id, name: `${r.firstName} ${r.lastName}`, role: r.role })),
  };
}

async function getBroadcastInbox(user) {
  const tenantId = user?.tenantId || null;
  if (!tenantId) return [];

  const messages = await prisma.staffBroadcastMessage.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const isOwnerOrAdmin = ['COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT', 'BRANCH_MANAGER'].includes(
    String(user?.role || '').toUpperCase()
  );

  return messages
    .filter((m) => {
      if (isOwnerOrAdmin || m.targetScope === 'ALL_STAFF' || m.senderUserId === user.id) return true;
      const ids = Array.isArray(m.recipientUserIds) ? m.recipientUserIds : [];
      return ids.includes(user.id);
    })
    .map(formatBroadcastDto);
}

async function getRepaymentAlerts(tenantId) {
  if (!tenantId) return { dueLoans: [], totalBorrowers: 0, overdueCount: 0, totalDueAmountGhs: 0 };

  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const schedules = await prisma.repaymentSchedule.findMany({
    where: {
      isPaid: false,
      dueDate: { lte: in7Days },
      loan: {
        tenantId,
        status: { in: ['DISBURSED', 'ONGOING', 'OVERDUE', 'DEFAULTED'] },
      },
    },
    include: {
      loan: {
        include: {
          member: {
            include: {
              user: { select: { firstName: true, lastName: true, phone: true, gpsAddress: true } },
            },
          },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: 80,
  });

  const nowMs = Date.now();
  const dueLoans = schedules.map((s) => {
    const dueCents = Math.max(0, Math.round((Number(s.totalDue || 0) - Number(s.amountPaid || 0)) * 100));
    const isOverdue = new Date(s.dueDate).getTime() < nowMs;
    const borrowerUser = s.loan?.member?.user;
    return {
      scheduleId: s.id,
      loanId: s.loanId,
      loanNumber: s.loan?.loanNumber,
      installmentNo: s.installmentNo,
      dueDate: s.dueDate,
      isOverdue,
      amountDueGhs: dueCents / 100,
      borrowerName: borrowerUser ? `${borrowerUser.firstName} ${borrowerUser.lastName}`.trim() : 'Customer',
      borrowerPhone: borrowerUser?.phone || '',
      borrowerGpsAddress: borrowerUser?.gpsAddress || s.loan?.member?.gpsAddress || '',
    };
  });

  const totalCents = dueLoans.reduce((sum, item) => sum + Math.round(item.amountDueGhs * 100), 0);
  return {
    dueLoans,
    totalBorrowers: dueLoans.length,
    overdueCount: dueLoans.filter((d) => d.isOverdue).length,
    totalDueAmountGhs: totalCents / 100,
  };
}

async function dispatchStaffCollectionReminders(senderUser, tenantId = null) {
  const scopeTenantId = tenantId || senderUser?.tenantId || null;
  if (!scopeTenantId) throw new ValidationError('Tenant context required');

  const alerts = await getRepaymentAlerts(scopeTenantId);
  const collectionStaff = await prisma.user.findMany({
    where: {
      tenantId: scopeTenantId,
      status: 'ACTIVE',
      role: {
        in: [
          'LOAN_OFFICER', 'SENIOR_CREDIT_OFFICER', 'COLLECTIONS', 'FIELD_OFFICER',
          'COLLECTOR', 'MOBILE_STAFF', 'STAFF', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'COMPANY_OWNER',
        ],
      },
    },
    select: { id: true, firstName: true, lastName: true, phone: true, role: true },
  });

  const alertText = alerts.totalBorrowers > 0
    ? `COLLECTION ACTION REQUIRED: ${alerts.totalBorrowers} borrower installment(s) (${alerts.overdueCount} overdue) totalling GHS ${alerts.totalDueAmountGhs.toFixed(2)} must be collected. Follow up immediately with listed borrowers.`
    : 'All scheduled loan installments are up to date for this week.';

  await Promise.all(
    collectionStaff.map((staff) =>
      prisma.notification.create({
        data: {
          tenantId: scopeTenantId,
          userId: staff.id,
          type: 'IN_APP',
          category: 'PAYMENT_REMINDER',
          title: `Staff Payment Collection Notice (${alerts.totalBorrowers} Due)`,
          message: alertText,
          recipient: staff.phone || staff.id,
          status: 'SENT',
          sentAt: new Date(),
          metadata: {
            subCategory: 'PAYMENT_COLLECTION_ALERT',
            totalBorrowers: alerts.totalBorrowers,
            overdueCount: alerts.overdueCount,
            totalDueAmountGhs: alerts.totalDueAmountGhs,
          },
        },
      })
    )
  );

  emitToTenant(scopeTenantId, 'staff:collection_alert', {
    totalBorrowers: alerts.totalBorrowers,
    overdueCount: alerts.overdueCount,
    totalDueAmountGhs: alerts.totalDueAmountGhs,
    message: alertText,
  });

  return {
    notifiedStaffCount: collectionStaff.length,
    ...alerts,
    message: alertText,
  };
}

module.exports = {
  queue,
  deliverNow,
  processNotification,
  getByUserId,
  getQueueStatus,
  markAsRead,
  sendPaymentReminder,
  broadcastToStaff,
  getBroadcastInbox,
  getRepaymentAlerts,
  dispatchStaffCollectionReminders,
};
