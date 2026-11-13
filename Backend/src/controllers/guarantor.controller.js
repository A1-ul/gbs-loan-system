const guarantorService = require('../services/guarantor.service');
const { success, paginated } = require('../utils/response');

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await guarantorService.getAll({ page: +page, limit: +limit });
    return paginated(res, result.data, result.pagination);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const guarantor = await guarantorService.getById(req.params.id);
    return success(res, guarantor);
  } catch (err) { next(err); }
}

async function getLoansByGuarantor(req, res, next) {
  try {
    const loans = await guarantorService.getLoans(req.params.id);
    return success(res, loans);
  } catch (err) { next(err); }
}

async function signAgreement(req, res, next) {
  try {
    const result = await guarantorService.signAgreement(req.params.id);
    return success(res, result, 'Agreement signed');
  } catch (err) { next(err); }
}

async function togglePenaltyNotifications(req, res, next) {
  try {
    const result = await guarantorService.togglePenaltyNotifications(req.params.id, req.body.enabled);
    return success(res, result);
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, getLoansByGuarantor, signAgreement, togglePenaltyNotifications };
