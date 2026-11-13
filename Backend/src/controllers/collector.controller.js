const collectorService = require('../services/collector.service');
const { success, paginated } = require('../utils/response');

async function getAll(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const result = await collectorService.getAll(tenantId);
    return success(res, result);
  } catch (err) { next(err); }
}

async function getLiveLocations(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const locations = await collectorService.getLiveLocations(tenantId);
    return success(res, locations);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const collector = await collectorService.getById(req.params.id);
    return success(res, collector);
  } catch (err) { next(err); }
}

async function getLocationHistory(req, res, next) {
  try {
    const { startDate, endDate } = req.query;
    const history = await collectorService.getLocationHistory(req.params.id, { startDate, endDate });
    return success(res, history);
  } catch (err) { next(err); }
}

async function updateStatus(req, res, next) {
  try {
    const collector = await collectorService.updateStatus(req.params.id, req.body.status);
    return success(res, collector);
  } catch (err) { next(err); }
}

module.exports = { getAll, getLiveLocations, getById, getLocationHistory, updateStatus };
