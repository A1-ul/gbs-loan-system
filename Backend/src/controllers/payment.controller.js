const paymentService = require('../services/payment.service');
const loanService = require('../services/loan.service');
const { success, created, paginated } = require('../utils/response');
const { AuthorizationError } = require('../utils/errors');
const { normalizeCapabilityRole } = require('../constants/roleCapabilities');

function assertLoanPaymentAccess(req, loan) {
  const callerTenantId = req.tenantId || req.user?.tenantId || null;
  if (callerTenantId && loan?.tenantId && loan.tenantId !== callerTenantId) {
    throw new AuthorizationError('Cross-tenant loan repayment is forbidden.');
  }
  const canonicalRole = normalizeCapabilityRole(req.user?.role);
  if (canonicalRole === 'MEMBER_PORTAL' && loan?.member?.userId !== req.user?.id) {
    throw new AuthorizationError('Borrowers can only record or inspect payments on their own loans.');
  }
  if (canonicalRole === 'GUARANTOR_PORTAL') {
    const isGuarantor = (loan?.loanGuarantors || []).some((lg) => lg.guarantor?.userId === req.user?.id);
    if (!isGuarantor) {
      throw new AuthorizationError('Guarantors can only record or inspect payments on loans they guarantee.');
    }
  }
}

async function create(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || null;
    if (req.body?.loanId) {
      const loan = await loanService.getById(req.body.loanId);
      assertLoanPaymentAccess(req, loan);
    }
    const payment = await paymentService.create(req.user.id, req.body, tenantId);
    return created(res, payment, 'Payment initiated');
  } catch (err) {
    next(err);
  }
}

async function getMyPayments(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || null;
    const rows = await paymentService.getMyPayments(req.user.id, req.user.role, tenantId);
    return success(res, rows);
  } catch (err) {
    next(err);
  }
}

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20, status, method, loanId } = req.query;
    const tenantId = req.tenantId || req.user?.tenantId || null;
    const result = await paymentService.getAll({ page: +page, limit: +limit, status, method, loanId, tenantId });
    return paginated(res, result.data, result.pagination);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const payment = await paymentService.getById(req.params.id);
    assertLoanPaymentAccess(req, payment.loan);
    return success(res, payment);
  } catch (err) {
    next(err);
  }
}

async function approveCash(req, res, next) {
  try {
    const payment = await paymentService.approveCash(req.params.id, req.user.id, req.body);
    return success(res, payment, 'Cash payment processed');
  } catch (err) {
    next(err);
  }
}

async function initiateMoMo(req, res, next) {
  try {
    if (req.body?.loanId) {
      const loan = await loanService.getById(req.body.loanId);
      assertLoanPaymentAccess(req, loan);
    }
    const result = await paymentService.initiateMoMo(req.body);
    return success(res, result, 'MoMo payment initiated');
  } catch (err) {
    next(err);
  }
}

async function momoCallback(req, res, next) {
  try {
    await paymentService.handleMoMoCallback(req.body);
    return res.status(200).json({ status: 'OK' });
  } catch (err) {
    next(err);
  }
}

async function checkMoMoStatus(req, res, next) {
  try {
    const status = await paymentService.checkMoMoStatus(req.params.ref);
    return success(res, status);
  } catch (err) {
    next(err);
  }
}

async function getMonthlyTrends(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || null;
    const trends = await paymentService.getMonthlyTrends(tenantId);
    return success(res, trends);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  getAll,
  getMyPayments,
  getById,
  approveCash,
  initiateMoMo,
  momoCallback,
  checkMoMoStatus,
  getMonthlyTrends,
};
