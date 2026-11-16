const loanService = require('../services/loan.service');
const { success, created, paginated } = require('../utils/response');
const { AuthorizationError } = require('../utils/errors');
const { normalizeCapabilityRole } = require('../constants/roleCapabilities');

function assertLoanReadAccess(req, loan) {
  const callerTenantId = req.tenantId || req.user?.tenantId || null;
  if (callerTenantId && loan.tenantId && loan.tenantId !== callerTenantId) {
    throw new AuthorizationError('Cross-tenant loan access is forbidden.');
  }
  const canonicalRole = normalizeCapabilityRole(req.user?.role);
  if (canonicalRole === 'MEMBER_PORTAL') {
    if (loan.member?.userId !== req.user?.id) {
      throw new AuthorizationError('Borrowers can only inspect their own loan records.');
    }
  } else if (canonicalRole === 'GUARANTOR_PORTAL') {
    const isLinkedGuarantor = (loan.loanGuarantors || []).some((lg) => lg.guarantor?.userId === req.user?.id);
    if (!isLinkedGuarantor) {
      throw new AuthorizationError('Guarantors can only inspect loan facilities they guarantee.');
    }
  }
}

async function apply(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || null;
    const canonicalRole = normalizeCapabilityRole(req.user?.role);
    const payload = { ...req.body, tenantId };
    if (canonicalRole === 'MEMBER_PORTAL') {
      delete payload.memberId;
    }
    const loan = await loanService.apply(req.user.id, payload);
    return created(res, loan, 'Loan application submitted');
  } catch (err) {
    next(err);
  }
}

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20, status, memberId, search } = req.query;
    const tenantId = req.tenantId || req.user?.tenantId || null;
    const result = await loanService.getAll({ page: +page, limit: +limit, status, memberId, search, tenantId });
    return paginated(res, result.data, result.pagination);
  } catch (err) {
    next(err);
  }
}

async function getMyLoans(req, res, next) {
  try {
    const canonicalRole = normalizeCapabilityRole(req.user?.role);
    const tenantId = req.tenantId || req.user?.tenantId || null;
    const loans = canonicalRole === 'GUARANTOR_PORTAL'
      ? await loanService.getGuaranteedLoansByUserId(req.user.id, tenantId)
      : await loanService.getByUserId(req.user.id);
    return success(res, loans);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const loan = await loanService.getById(req.params.id);
    assertLoanReadAccess(req, loan);
    return success(res, loan);
  } catch (err) {
    next(err);
  }
}

async function getRepaymentSchedule(req, res, next) {
  try {
    const loan = await loanService.getById(req.params.id);
    assertLoanReadAccess(req, loan);
    const schedule = await loanService.getRepaymentSchedule(loan.id);
    return success(res, schedule);
  } catch (err) {
    next(err);
  }
}

async function getWorkflowHistory(req, res, next) {
  try {
    const history = await loanService.getWorkflowHistory(req.params.id);
    return success(res, history);
  } catch (err) {
    next(err);
  }
}

async function review(req, res, next) {
  try {
    const loan = await loanService.review(req.params.id, req.user.id, req.body);
    return success(res, loan, 'Loan reviewed');
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  try {
    const loan = await loanService.approve(req.params.id, req.user.id);
    return success(res, loan, 'Loan approved');
  } catch (err) {
    next(err);
  }
}

async function disburse(req, res, next) {
  try {
    const loan = await loanService.disburse(req.params.id, req.user.id, req.body);
    return success(res, loan, 'Loan disbursed');
  } catch (err) {
    next(err);
  }
}

async function close(req, res, next) {
  try {
    const loan = await loanService.close(req.params.id, req.user.id);
    return success(res, loan, 'Loan closed');
  } catch (err) {
    next(err);
  }
}

async function getStatusDistribution(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || null;
    const data = await loanService.getStatusDistribution(tenantId);
    return success(res, data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  apply,
  getAll,
  getMyLoans,
  getById,
  getRepaymentSchedule,
  getWorkflowHistory,
  review,
  approve,
  disburse,
  close,
  getStatusDistribution,
};
