const staffService = require('../services/staff.service');
const { success, created, paginated } = require('../utils/response');

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await staffService.getAll({ page: +page, limit: +limit });
    return paginated(res, result.data, result.pagination);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const staff = await staffService.getById(req.params.id);
    return success(res, staff);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const staff = await staffService.create(req.body);
    return created(res, staff);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const staff = await staffService.update(req.params.id, req.body);
    return success(res, staff);
  } catch (err) { next(err); }
}

async function deactivate(req, res, next) {
  try {
    await staffService.deactivate(req.params.id);
    return success(res, null, 'Staff deactivated');
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, create, update, deactivate };
