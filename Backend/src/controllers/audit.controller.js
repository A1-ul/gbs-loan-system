const auditService = require('../services/audit.service');
const { success, paginated } = require('../utils/response');

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 50, action, entityType, userId } = req.query;
    const tenantId = req.tenantId || req.user?.tenantId;
    const result = await auditService.getAll({ page: +page, limit: +limit, action, entityType, userId, tenantId });
    return paginated(res, result.data, result.pagination);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const log = await auditService.getById(req.params.id);
    return success(res, log);
  } catch (err) { next(err); }
}

async function getByEntity(req, res, next) {
  try {
    const logs = await auditService.getByEntity(req.params.type, req.params.id);
    return success(res, logs);
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, getByEntity };
