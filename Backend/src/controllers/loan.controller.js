const loanService = require('../services/loan.service');
const { success, created, paginated } = require('../utils/response');

async function apply(req, res, next) {
  try {
    const loan = await loanService.apply(req.user.id, req.body);
    return created(res, loan, 'Loan application submitted');
  } catch (err) {
    next(err);
  }
}

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20, status, memberId } = req.query;
    const result = await loanService.getAll({ page: +page, limit: +limit, status, memberId });
    return paginated(res, result.data, result.pagination);
  } catch (err) {
    next(err);
  }
}

async function getMyLoans(req, res, next) {
  try {
    const loans = await loanService.getByUserId(req.user.id);
    return success(res, loans);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const loan = await loanService.getById(req.params.id);
    return success(res, loan);
  } catch (err) {
    next(err);
  }
}

async function getRepaymentSchedule(req, res, next) {
  try {
    const schedule = await loanService.getRepaymentSchedule(req.params.id);
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
    const data = await loanService.getStatusDistribution();
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
