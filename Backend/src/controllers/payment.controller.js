const paymentService = require('../services/payment.service');
const { success, created, paginated } = require('../utils/response');

async function create(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || null;
    const payment = await paymentService.create(req.user.id, req.body, tenantId);
    return created(res, payment, 'Payment initiated');
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
  getById,
  approveCash,
  initiateMoMo,
  momoCallback,
  checkMoMoStatus,
  getMonthlyTrends,
};
