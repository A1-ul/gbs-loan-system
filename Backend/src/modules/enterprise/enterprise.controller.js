const enterpriseService = require('./enterprise.service');
const { success, created } = require('../../utils/response');

const getTenantScope = (req) => req.tenantId || req.user?.tenantId || null;

exports.getLoanProducts = async (req, res, next) => {
  try {
    return success(res, await enterpriseService.getLoanProducts(getTenantScope(req)));
  } catch (err) { next(err); }
};

exports.createLoanProduct = async (req, res, next) => {
  try {
    return created(res, await enterpriseService.createLoanProduct(req.body, getTenantScope(req)));
  } catch (err) { next(err); }
};

exports.getCollaterals = async (req, res, next) => {
  try {
    return success(res, await enterpriseService.getCollaterals(getTenantScope(req)));
  } catch (err) { next(err); }
};

exports.createCollateral = async (req, res, next) => {
  try {
    return created(res, await enterpriseService.createCollateral(req.body, getTenantScope(req), req.user?.id));
  } catch (err) { next(err); }
};

exports.getCustomerVisits = async (req, res, next) => {
  try {
    return success(res, await enterpriseService.getCustomerVisits(getTenantScope(req)));
  } catch (err) { next(err); }
};

exports.recordCustomerVisit = async (req, res, next) => {
  try {
    return created(res, await enterpriseService.recordCustomerVisit(req.body, req.user?.id, getTenantScope(req)));
  } catch (err) { next(err); }
};

exports.getComplianceCases = async (req, res, next) => {
  try {
    return success(res, await enterpriseService.getComplianceCases(getTenantScope(req), req.query.category || null));
  } catch (err) { next(err); }
};

exports.createComplianceCase = async (req, res, next) => {
  try {
    return created(res, await enterpriseService.createComplianceCase(req.body, getTenantScope(req), req.user?.id));
  } catch (err) { next(err); }
};

exports.updateComplianceCase = async (req, res, next) => {
  try {
    return success(res, await enterpriseService.updateComplianceCase(req.params.id, req.body));
  } catch (err) { next(err); }
};

exports.getSupportTickets = async (req, res, next) => {
  try {
    return success(res, await enterpriseService.getSupportTickets(getTenantScope(req)));
  } catch (err) { next(err); }
};

exports.createSupportTicket = async (req, res, next) => {
  try {
    return created(res, await enterpriseService.createSupportTicket(req.body, getTenantScope(req), req.user?.id));
  } catch (err) { next(err); }
};

exports.updateSupportTicket = async (req, res, next) => {
  try {
    return success(res, await enterpriseService.updateSupportTicket(req.params.id, req.body));
  } catch (err) { next(err); }
};

exports.getInvestors = async (req, res, next) => {
  try {
    return success(res, await enterpriseService.getInvestors(getTenantScope(req)));
  } catch (err) { next(err); }
};

exports.createInvestor = async (req, res, next) => {
  try {
    return created(res, await enterpriseService.createInvestor(req.body, getTenantScope(req)));
  } catch (err) { next(err); }
};

exports.getCampaigns = async (req, res, next) => {
  try {
    return success(res, await enterpriseService.getCampaigns(getTenantScope(req)));
  } catch (err) { next(err); }
};

exports.createCampaign = async (req, res, next) => {
  try {
    return created(res, await enterpriseService.createCampaign(req.body, getTenantScope(req)));
  } catch (err) { next(err); }
};

exports.getDocuments = async (req, res, next) => {
  try {
    return success(res, await enterpriseService.getDocuments(getTenantScope(req)));
  } catch (err) { next(err); }
};

exports.createDocument = async (req, res, next) => {
  try {
    return created(res, await enterpriseService.createDocument(req.body, req.file, getTenantScope(req), req.user?.id));
  } catch (err) { next(err); }
};

exports.getDeletionRequests = async (req, res, next) => {
  try {
    return success(res, await enterpriseService.getDeletionRequests(getTenantScope(req)));
  } catch (err) { next(err); }
};

exports.reviewDeletionRequest = async (req, res, next) => {
  try {
    return success(res, await enterpriseService.reviewDeletionRequest(req.params.id, req.body.action, req.user?.id, req.body.notes));
  } catch (err) { next(err); }
};

exports.generateMonthlyPayroll = async (req, res, next) => {
  try {
    return created(res, await enterpriseService.generateMonthlyPayroll(getTenantScope(req), req.body.month, req.body.year));
  } catch (err) { next(err); }
};

exports.exportReport = async (req, res, next) => {
  try {
    const file = await enterpriseService.exportReport(req.params.type, req.query.format || 'csv', getTenantScope(req));
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return res.send(file.buffer);
  } catch (err) { next(err); }
};

