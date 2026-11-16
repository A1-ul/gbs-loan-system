const { prisma } = require('../config/database');
const momoIntegration = require('../integrations/momo.service');
const { toCents, fromCents } = require('./loanEngine.service');
const config = require('../config');
const logger = require('../utils/logger');
const { NotFoundError, AppError, ValidationError } = require('../utils/errors');
const { getRecordProvenance } = require('../config/environments');

async function applyPaymentToLoanAndSchedule(tx, loan, amount) {
  const amountCents = toCents(amount);
  const totalAmountCents = toCents(loan.totalAmount);
  const newPaidCents = toCents(loan.amountPaid) + amountCents;
  const newOutstandingCents = Math.max(0, totalAmountCents - newPaidCents);
  const newPaid = fromCents(newPaidCents);
  const newOutstanding = fromCents(newOutstandingCents);
  const newStatus = newOutstandingCents === 0 ? 'PAID' : (loan.status === 'DISBURSED' ? 'ONGOING' : loan.status);

  await tx.loan.update({
    where: { id: loan.id },
    data: {
      amountPaid: newPaid,
      outstandingAmount: newOutstanding,
      status: newStatus,
      closedAt: newOutstandingCents === 0 ? new Date() : loan.closedAt,
    },
  });

  // Apply payment FIFO across unpaid installments using exact integer-pesewa precision
  let remainingCents = amountCents;
  const unpaidSchedules = await tx.repaymentSchedule.findMany({
    where: { loanId: loan.id, isPaid: false },
    orderBy: { installmentNo: 'asc' },
  });

  for (const inst of unpaidSchedules) {
    if (remainingCents <= 0) break;
    const totalDueCents = toCents(inst.totalDue);
    const alreadyPaidCents = toCents(inst.amountPaid);
    const dueLeftCents = Math.max(0, totalDueCents - alreadyPaidCents);
    const applyCents = Math.min(remainingCents, dueLeftCents);
    const updatedAmtPaidCents = alreadyPaidCents + applyCents;
    const fullyPaid = updatedAmtPaidCents >= totalDueCents;

    await tx.repaymentSchedule.update({
      where: { id: inst.id },
      data: {
        amountPaid: fromCents(updatedAmtPaidCents),
        isPaid: fullyPaid,
        paidAt: fullyPaid ? new Date() : null,
      },
    });

    remainingCents -= applyCents;
  }
}

async function create(collectedById, data, tenantId = null) {
  const loan = await prisma.loan.findUnique({ where: { id: data.loanId } });
  if (!loan) throw new NotFoundError('Loan record');

  const amount = Number(data.amount);
  if (!amount || amount <= 0) throw new ValidationError('Payment amount must be positive');

  const method = data.method || 'MOMO';
  const paymentRef = `PAY-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const receiptNumber = `RCP-${Date.now().toString().slice(-6)}`;
  // Cash collections require Accountant/Finance Manager verification before ledger settlement
  const initialStatus = method === 'CASH' ? 'AWAITING_APPROVAL' : 'COMPLETED';

  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        tenantId: tenantId || loan.tenantId || null,
        branchId: loan.branchId || null,
        paymentRef,
        loanId: loan.id,
        amount,
        method,
        status: initialStatus,
        momoTransactionId: data.momoTransactionId || null,
        momoPhone: data.momoPhone || null,
        bankReference: data.bankReference || null,
        receiptNumber,
        collectedById: collectedById || null,
        paidAt: initialStatus === 'COMPLETED' ? new Date() : null,
        notes: data.notes || null,
        ...getRecordProvenance(),
      },
      include: { loan: { select: { loanNumber: true, memberId: true } } },
    });

    if (initialStatus === 'COMPLETED') {
      await applyPaymentToLoanAndSchedule(tx, loan, amount);
    }

    return p;
  });

  logger.info(`Payment created: ${payment.paymentRef} (${method}, status=${initialStatus}, GHS ${amount})`);
  return payment;
}

async function createPayment(data) {
  return create(data.collectedById || null, data, data.tenantId || null);
}

async function getAll({ page = 1, limit = 20, status, method, loanId, tenantId = null }) {
  const skip = (page - 1) * limit;
  const where = {
    ...(tenantId ? { tenantId } : {}),
    ...(status ? { status } : {}),
    ...(method ? { method } : {}),
    ...(loanId ? { loanId } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      include: {
        loan: {
          include: {
            member: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getById(id) {
  const payment = await prisma.payment.findFirst({
    where: { OR: [{ id }, { paymentRef: id }] },
    include: {
      loan: {
        include: {
          member: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } } } },
          loanGuarantors: { include: { guarantor: { select: { id: true, userId: true } } } },
        },
      },
    },
  });
  if (!payment) throw new NotFoundError(`Payment record '${id}'`);
  return payment;
}

async function getMyPayments(userId, role, tenantId = null) {
  const isGuarantor = String(role || '').toUpperCase().includes('GUARANTOR');
  const where = {
    ...(tenantId ? { tenantId } : {}),
    loan: isGuarantor
      ? { loanGuarantors: { some: { guarantor: { userId } } } }
      : { member: { userId } },
  };
  return prisma.payment.findMany({
    where,
    include: {
      loan: {
        select: {
          id: true,
          loanNumber: true,
          member: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

async function approveCash(paramId, approvedById, body = {}) {
  const targetId = body.paymentId || paramId;
  const payment = await getById(targetId);

  if (payment.method !== 'CASH') {
    throw new AppError('Only CASH payments require cashier approval.', 400);
  }
  if (payment.status !== 'AWAITING_APPROVAL' && payment.status !== 'PENDING') {
    throw new AppError(`Payment '${payment.paymentRef}' is already ${payment.status}.`, 400);
  }

  const approved = body.approved !== false;
  return prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: approved ? 'COMPLETED' : 'FAILED',
        approvedById,
        approvedAt: new Date(),
        paidAt: approved ? new Date() : null,
        notes: body.notes || payment.notes,
      },
    });

    if (approved) {
      const loan = await tx.loan.findUnique({ where: { id: payment.loanId } });
      if (loan) {
        await applyPaymentToLoanAndSchedule(tx, loan, Number(payment.amount));
      }
    }

    return updated;
  });
}

async function initiateMoMo(data) {
  const { loanId, amount, momoPhone, collectedById } = data;
  const loan = await prisma.loan.findUnique({ where: { id: loanId } });
  if (!loan) throw new NotFoundError('Loan record');

  const paymentRef = `MOMO-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const hasLiveMomoCreds = Boolean(config.momo?.apiUser && config.momo?.apiKey && config.momo?.subscriptionKey);

  let gatewayResponse = { status: 'PROCESSING', referenceId: paymentRef, gatewayMode: 'SANDBOX_AWAITING_CALLBACK' };
  if (hasLiveMomoCreds) {
    try {
      const liveRes = await momoIntegration.requestToPay({ amount, phone: momoPhone, externalId: paymentRef });
      gatewayResponse = { ...liveRes, gatewayMode: 'LIVE_MTN_MOMO' };
    } catch (err) {
      logger.warn(`MoMo external call fallback for ${paymentRef}: ${err.message}`);
      gatewayResponse = { status: 'FAILED_GATEWAY', referenceId: paymentRef, error: err.message };
    }
  }

  const payment = await prisma.payment.create({
    data: {
      tenantId: loan.tenantId || null,
      branchId: loan.branchId || null,
      paymentRef,
      loanId: loan.id,
      amount: Number(amount),
      method: 'MOMO',
      status: 'PROCESSING',
      momoTransactionId: gatewayResponse.referenceId || paymentRef,
      momoPhone,
      collectedById: collectedById || null,
      notes: `MoMo initiation (${gatewayResponse.gatewayMode})`,
      ...getRecordProvenance(),
    },
  });

  return { payment, gateway: gatewayResponse };
}

async function handleMoMoCallback(payload = {}) {
  const ref = payload.externalId || payload.referenceId || payload.momoTransactionId;
  if (!ref) throw new ValidationError('Missing MoMo reference identifier in callback');

  const payment = await prisma.payment.findFirst({
    where: { OR: [{ paymentRef: ref }, { momoTransactionId: ref }] },
  });
  if (!payment) throw new NotFoundError(`MoMo payment '${ref}'`);
  if (payment.status === 'COMPLETED') return payment;

  const isSuccess = String(payload.status || '').toUpperCase() === 'SUCCESSFUL' || payload.success === true;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: isSuccess ? 'COMPLETED' : 'FAILED',
        paidAt: isSuccess ? new Date() : null,
        notes: `Callback status: ${payload.status || (isSuccess ? 'SUCCESSFUL' : 'FAILED')}`,
      },
    });

    if (isSuccess) {
      const loan = await tx.loan.findUnique({ where: { id: payment.loanId } });
      if (loan) await applyPaymentToLoanAndSchedule(tx, loan, Number(payment.amount));
    }

    return updated;
  });
}

async function checkMoMoStatus(ref) {
  const payment = await prisma.payment.findFirst({
    where: { OR: [{ paymentRef: ref }, { momoTransactionId: ref }, { id: ref }] },
  });
  if (!payment) throw new NotFoundError(`MoMo transaction '${ref}'`);

  let externalStatus = null;
  if (config.momo?.apiUser && config.momo?.apiKey && payment.momoTransactionId) {
    externalStatus = await momoIntegration.getTransactionStatus(payment.momoTransactionId).catch(() => null);
  }

  return {
    paymentRef: payment.paymentRef,
    status: payment.status,
    amount: Number(payment.amount),
    momoPhone: payment.momoPhone,
    paidAt: payment.paidAt,
    externalStatus,
  };
}

async function getMonthlyTrends(tenantId = null) {
  const payments = await prisma.payment.findMany({
    where: { ...(tenantId ? { tenantId } : {}), status: 'COMPLETED' },
    select: { amount: true, method: true, paidAt: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const map = {};
  for (const p of payments) {
    const dt = p.paidAt || p.createdAt;
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    if (!map[key]) map[key] = { month: key, totalCents: 0, momoCents: 0, cashCents: 0, bankCents: 0, count: 0 };
    const amtCents = toCents(p.amount);
    map[key].totalCents += amtCents;
    if (p.method === 'MOMO') map[key].momoCents += amtCents;
    else if (p.method === 'CASH') map[key].cashCents += amtCents;
    else map[key].bankCents += amtCents;
    map[key].count++;
  }

  return Object.values(map).map((row) => ({
    month: row.month,
    totalAmount: fromCents(row.totalCents),
    momo: fromCents(row.momoCents),
    cash: fromCents(row.cashCents),
    bankTransfer: fromCents(row.bankCents),
    count: row.count,
  }));
}

module.exports = {
  create,
  createPayment,
  getAll,
  getMyPayments,
  getById,
  approveCash,
  initiateMoMo,
  handleMoMoCallback,
  checkMoMoStatus,
  getMonthlyTrends,
};
