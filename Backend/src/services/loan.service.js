const { prisma } = require('../config/database');
const loanEngine = require('./loanEngine.service');
const notificationService = require('./notification.service');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError, AppError } = require('../utils/errors');
const { getRecordProvenance } = require('../config/environments');

async function getActorAuditMeta(tx, actorId) {
  if (!actorId) return { name: 'System Automated Process', role: 'SYSTEM' };
  const actor = await tx.user.findUnique({
    where: { id: actorId },
    select: { firstName: true, lastName: true, role: true, email: true },
  }).catch(() => null);
  if (!actor) return { name: actorId, role: 'STAFF' };
  return {
    name: `${actor.firstName || ''} ${actor.lastName || ''}`.trim() || actor.email || actorId,
    role: actor.role || 'STAFF',
  };
}

function buildAuditSnapshot(loanRecord, actionLabel, extra = {}) {
  return {
    action: actionLabel,
    recordedAt: new Date().toISOString(),
    loanNumber: loanRecord.loanNumber,
    status: loanRecord.status,
    principalAmount: Number(loanRecord.principalAmount || 0),
    interestRate: Number(loanRecord.interestRate || 0),
    termMonths: loanRecord.termMonths,
    totalAmount: Number(loanRecord.totalAmount || 0),
    amountPaid: Number(loanRecord.amountPaid || 0),
    outstandingAmount: Number(loanRecord.outstandingAmount || 0),
    purpose: loanRecord.purpose || null,
    ...extra,
  };
}

async function apply(userId, data, tenantId = null) {
  let member = null;
  if (data.memberId) {
    member = await prisma.member.findUnique({ where: { id: data.memberId }, include: { user: true } });
  } else {
    member = await prisma.member.findUnique({ where: { userId }, include: { user: true } });
    if (!member) {
      // Auto-resolve member profile if applicant is applying via their user account
      const applicant = await prisma.user.findUnique({ where: { id: userId } });
      if (!applicant) throw new NotFoundError('Applicant user account');
      member = await prisma.member.create({
        data: {
          tenantId: tenantId || applicant.tenantId || null,
          branchId: applicant.branchId || null,
          userId: applicant.id,
          memberNumber: `MBR-${Date.now().toString().slice(-6)}`,
          ...getRecordProvenance(),
        },
        include: { user: true },
      });
    }
  }

  if (!member) {
    throw new NotFoundError('Member borrower profile');
  }

  const resolvedTenantId = tenantId || member.tenantId || member.user?.tenantId || null;
  const principal = Number(data.principalAmount);
  const termMonths = parseInt(data.termMonths || 12, 10);
  const rate = Number(data.interestRate || 15.0);
  const penaltyRate = Number(data.penaltyRate || 5.0);

  if (!principal || principal <= 0) {
    throw new ValidationError('Principal amount must be greater than zero');
  }

  const calc = loanEngine.calculateLoan({ principal, interestRate: rate, termMonths, penaltyRate });
  const loanNumber = `LN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const guarantorIds = Array.isArray(data.guarantorIds) ? data.guarantorIds : [];

  const loan = await prisma.$transaction(async (tx) => {
    const created = await tx.loan.create({
      data: {
        tenantId: resolvedTenantId,
        branchId: member.branchId || null,
        loanNumber,
        memberId: member.id,
        loanProductId: data.loanProductId || null,
        principalAmount: calc.principal,
        interestRate: calc.interestRate,
        penaltyRate: calc.penaltyRate,
        termMonths: calc.termMonths,
        totalAmount: calc.totalAmount,
        amountPaid: 0,
        outstandingAmount: calc.totalAmount,
        status: 'PENDING',
        purpose: data.purpose || 'General Business / Personal Facility',
        riskScore: member.creditScore || 680,
        notes: data.notes || null,
        ...getRecordProvenance(),
      },
      include: { member: { include: { user: true } } },
    });

    for (const gId of guarantorIds) {
      const gExists = await tx.guarantor.findUnique({ where: { id: gId } });
      if (gExists) {
        await tx.loanGuarantor.create({
          data: { loanId: created.id, guarantorId: gId },
        });
      }
    }

    const actorMeta = await getActorAuditMeta(tx, userId);
    const snapshot = buildAuditSnapshot(created, 'LOAN_APPLICATION_SUBMITTED', {
      borrowerName: `${member.user?.firstName || ''} ${member.user?.lastName || ''}`.trim(),
      memberNumber: member.memberNumber,
    });

    await tx.loanWorkflowLog.create({
      data: {
        loanId: created.id,
        fromStatus: 'PENDING',
        toStatus: 'PENDING',
        performedBy: userId,
        performedByName: actorMeta.name,
        performedByRole: actorMeta.role,
        auditSnapshot: snapshot,
        notes: `Loan application submitted for GHS ${calc.principal.toLocaleString()} (${calc.termMonths} months)`,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: created.tenantId || null,
        userId,
        action: 'CREATE',
        entityType: 'Loan',
        entityId: created.id,
        newValues: snapshot,
      },
    }).catch(() => {});

    return created;
  });

  logger.info(`Loan application submitted: ${loan.loanNumber}`);
  return loan;
}

async function create(data) {
  return apply(data.userId || data.memberId, data, data.tenantId || null);
}

async function getAll({ page = 1, limit = 20, status, memberId, search, tenantId = null }) {
  const skip = (page - 1) * limit;
  const where = {
    ...(tenantId ? { tenantId } : {}),
    ...(status ? { status } : {}),
    ...(memberId ? { memberId } : {}),
    ...(search
      ? {
          OR: [
            { loanNumber: { contains: search, mode: 'insensitive' } },
            { purpose: { contains: search, mode: 'insensitive' } },
            { member: { memberNumber: { contains: search, mode: 'insensitive' } } },
            { member: { user: { firstName: { contains: search, mode: 'insensitive' } } } },
            { member: { user: { lastName: { contains: search, mode: 'insensitive' } } } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.loan.findMany({
      where,
      skip,
      take: limit,
      include: {
        member: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } },
        payments: { orderBy: { createdAt: 'desc' }, take: 5 },
        loanGuarantors: { include: { guarantor: { include: { user: { select: { firstName: true, lastName: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.loan.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getByUserId(userId) {
  const member = await prisma.member.findUnique({ where: { userId } });
  if (!member) return [];
  return prisma.loan.findMany({
    where: { memberId: member.id },
    include: {
      schedule: { orderBy: { installmentNo: 'asc' } },
      payments: { orderBy: { createdAt: 'desc' } },
      workflowLogs: { orderBy: { createdAt: 'asc' } },
      penalties: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function getById(id) {
  const loan = await prisma.loan.findFirst({
    where: { OR: [{ id }, { loanNumber: id }] },
    include: {
      member: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, profilePicture: true } } } },
      schedule: { orderBy: { installmentNo: 'asc' } },
      payments: { orderBy: { createdAt: 'desc' } },
      workflowLogs: { orderBy: { createdAt: 'asc' } },
      loanGuarantors: { include: { guarantor: { include: { user: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } } } } } },
      penalties: true,
      collaterals: true,
    },
  });
  if (!loan) throw new NotFoundError(`Loan record '${id}'`);
  return loan;
}

async function getRepaymentSchedule(id) {
  const loan = await getById(id);
  return prisma.repaymentSchedule.findMany({
    where: { loanId: loan.id },
    orderBy: { installmentNo: 'asc' },
  });
}

async function getWorkflowHistory(id) {
  const loan = await getById(id);
  return prisma.loanWorkflowLog.findMany({
    where: { loanId: loan.id },
    orderBy: { createdAt: 'asc' },
  });
}

async function review(id, reviewerId, { action, notes, rejectionReason }) {
  const loan = await getById(id);
  if (!['PENDING', 'UNDER_REVIEW'].includes(loan.status)) {
    throw new AppError(`Cannot review loan in status '${loan.status}'`, 400);
  }

  const nextStatus = action === 'reject' ? 'REJECTED' : 'UNDER_REVIEW';
  return prisma.$transaction(async (tx) => {
    const actorMeta = await getActorAuditMeta(tx, reviewerId);
    const updated = await tx.loan.update({
      where: { id: loan.id },
      data: {
        status: nextStatus,
        reviewedAt: new Date(),
        reviewedById: reviewerId,
        rejectionReason: action === 'reject' ? (rejectionReason || notes || 'Did not meet credit underwriting criteria') : null,
        notes: notes || loan.notes,
      },
    });

    const snapshot = buildAuditSnapshot(updated, `LOAN_${nextStatus}`, { previousStatus: loan.status, notes });
    await tx.loanWorkflowLog.create({
      data: {
        loanId: loan.id,
        fromStatus: loan.status,
        toStatus: nextStatus,
        performedBy: reviewerId,
        performedByName: actorMeta.name,
        performedByRole: actorMeta.role,
        auditSnapshot: snapshot,
        notes: notes || `Reviewed: ${action}`,
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: loan.tenantId || null,
        userId: reviewerId,
        action: action === 'reject' ? 'REJECT' : 'UPDATE',
        entityType: 'Loan',
        entityId: loan.id,
        oldValues: { status: loan.status },
        newValues: snapshot,
      },
    }).catch(() => {});

    return updated;
  });
}

async function approve(id, approvedById) {
  const loan = await getById(id);
  if (!['PENDING', 'UNDER_REVIEW'].includes(loan.status)) {
    throw new AppError(`Loan '${loan.loanNumber}' cannot be approved from status '${loan.status}'`, 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const actorMeta = await getActorAuditMeta(tx, approvedById);
    const res = await tx.loan.update({
      where: { id: loan.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById,
      },
      include: { member: { include: { user: true } } },
    });

    const snapshot = buildAuditSnapshot(res, 'LOAN_APPROVED', { previousStatus: loan.status });
    await tx.loanWorkflowLog.create({
      data: {
        loanId: loan.id,
        fromStatus: loan.status,
        toStatus: 'APPROVED',
        performedBy: approvedById,
        performedByName: actorMeta.name,
        performedByRole: actorMeta.role,
        auditSnapshot: snapshot,
        notes: 'Loan formally approved for disbursement',
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: loan.tenantId || null,
        userId: approvedById,
        action: 'APPROVE',
        entityType: 'Loan',
        entityId: loan.id,
        oldValues: { status: loan.status },
        newValues: snapshot,
      },
    }).catch(() => {});

    return res;
  });

  if (updated.member?.user) {
    await notificationService.queue({
      tenantId: updated.tenantId,
      userId: updated.member.user.id,
      type: 'SMS',
      category: 'LOAN_APPROVED',
      title: 'Loan Approved',
      message: `Your loan ${updated.loanNumber} for GHS ${updated.principalAmount} has been approved.`,
      recipient: updated.member.user.phone,
    }).catch(() => null);
  }

  return updated;
}

async function disburse(id, disbursedById, { notes } = {}) {
  const loan = await getById(id);
  if (!['APPROVED', 'PENDING', 'UNDER_REVIEW'].includes(loan.status)) {
    throw new AppError(`Loan '${loan.loanNumber}' cannot be disbursed from status '${loan.status}'`, 400);
  }

  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setMonth(dueDate.getMonth() + (loan.termMonths || 12));

  const scheduleItems = loanEngine.generateRepaymentSchedule({
    principalAmount: loan.principalAmount,
    interestRate: loan.interestRate,
    termMonths: loan.termMonths,
    disbursedAt: now,
  });

  const updated = await prisma.$transaction(async (tx) => {
    const existingCount = await tx.repaymentSchedule.count({ where: { loanId: loan.id } });
    if (existingCount === 0) {
      await tx.repaymentSchedule.createMany({
        data: scheduleItems.map((s) => ({
          loanId: loan.id,
          installmentNo: s.installmentNo,
          dueDate: s.dueDate,
          principalDue: s.principalDue,
          interestDue: s.interestDue,
          totalDue: s.totalDue,
        })),
      });
    }

    const actorMeta = await getActorAuditMeta(tx, disbursedById);
    const res = await tx.loan.update({
      where: { id: loan.id },
      data: {
        status: 'ONGOING',
        disbursedAt: now,
        disbursedById,
        dueDate,
        notes: notes || loan.notes,
      },
      include: { member: { include: { user: true } }, schedule: true },
    });

    const snapshot = buildAuditSnapshot(res, 'LOAN_DISBURSED', {
      previousStatus: loan.status,
      installmentsGenerated: scheduleItems.length,
    });
    await tx.loanWorkflowLog.create({
      data: {
        loanId: loan.id,
        fromStatus: loan.status,
        toStatus: 'ONGOING',
        performedBy: disbursedById,
        performedByName: actorMeta.name,
        performedByRole: actorMeta.role,
        auditSnapshot: snapshot,
        notes: notes || 'Loan funds disbursed and repayment schedule activated',
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId: loan.tenantId || null,
        userId: disbursedById,
        action: 'DISBURSE',
        entityType: 'Loan',
        entityId: loan.id,
        oldValues: { status: loan.status },
        newValues: snapshot,
      },
    }).catch(() => {});

    return res;
  });

  if (updated.member?.user) {
    await notificationService.queue({
      tenantId: updated.tenantId,
      userId: updated.member.user.id,
      type: 'SMS',
      category: 'LOAN_DISBURSED',
      title: 'Loan Disbursed',
      message: `GHS ${updated.principalAmount} for loan ${updated.loanNumber} has been disbursed.`,
      recipient: updated.member.user.phone,
    }).catch(() => null);
  }

  return updated;
}

async function close(id, closedById) {
  const loan = await getById(id);
  const outstanding = Number(loan.outstandingAmount || 0);
  if (outstanding > 0 && loan.status !== 'PAID' && loan.status !== 'DEFAULTED') {
    throw new AppError(`Cannot close loan '${loan.loanNumber}' with remaining balance GHS ${outstanding}`, 400);
  }

  return prisma.$transaction(async (tx) => {
    const actorMeta = await getActorAuditMeta(tx, closedById);
    const res = await tx.loan.update({
      where: { id: loan.id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
    const snapshot = buildAuditSnapshot(res, 'LOAN_CLOSED', { previousStatus: loan.status });
    await tx.loanWorkflowLog.create({
      data: {
        loanId: loan.id,
        fromStatus: loan.status,
        toStatus: 'CLOSED',
        performedBy: closedById,
        performedByName: actorMeta.name,
        performedByRole: actorMeta.role,
        auditSnapshot: snapshot,
        notes: 'Loan account formally closed',
      },
    });
    await tx.auditLog.create({
      data: {
        tenantId: loan.tenantId || null,
        userId: closedById,
        action: 'UPDATE',
        entityType: 'Loan',
        entityId: loan.id,
        oldValues: { status: loan.status },
        newValues: snapshot,
      },
    }).catch(() => {});
    return res;
  });
}

async function getStatusDistribution(tenantId = null) {
  const grouped = await prisma.loan.groupBy({
    by: ['status'],
    where: tenantId ? { tenantId } : {},
    _count: { id: true },
    _sum: { principalAmount: true, outstandingAmount: true, amountPaid: true },
  });

  return grouped.map((g) => ({
    status: g.status,
    count: g._count.id,
    principalTotal: Number(g._sum.principalAmount || 0),
    outstandingTotal: Number(g._sum.outstandingAmount || 0),
    paidTotal: Number(g._sum.amountPaid || 0),
  }));
}

module.exports = {
  apply,
  create,
  getAll,
  getByUserId,
  getById,
  getRepaymentSchedule,
  getWorkflowHistory,
  review,
  approve,
  disburse,
  close,
  getStatusDistribution,
  approveLoan: approve,
  disburseLoan: disburse,
};
