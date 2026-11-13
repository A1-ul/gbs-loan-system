const salaryService = require('../services/salary.service');
const { success, created, paginated } = require('../utils/response');

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20, status, month, year } = req.query;
    const tenantId = req.tenantId || req.user?.tenantId;
    const result = await salaryService.getAll({ page: +page, limit: +limit, status, month, year, tenantId });
    return paginated(res, result.data, result.pagination);
  } catch (err) { next(err); }
}

async function getSummary(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const summary = await salaryService.getSummary(tenantId);
    return success(res, summary);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const salary = await salaryService.create(req.body);
    return created(res, salary);
  } catch (err) { next(err); }
}

async function processPayment(req, res, next) {
  try {
    const salary = await salaryService.processPayment(req.params.id, req.user.id, req.body);
    return success(res, salary, 'Salary paid');
  } catch (err) { next(err); }
}

module.exports = { getAll, getSummary, create, processPayment };
