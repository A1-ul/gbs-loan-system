const guarantorService = require('../services/guarantor.service');
const { success, created, paginated } = require('../utils/response');
const { AuthorizationError } = require('../utils/errors');
const { normalizeCapabilityRole } = require('../constants/roleCapabilities');

async function assertGuarantorAccess(req, targetId, requireSelfOrStaff = true) {
  const guarantor = await guarantorService.getById(targetId);
  const callerTenantId = req.tenantId || req.user?.tenantId || null;
  if (callerTenantId && guarantor.tenantId && guarantor.tenantId !== callerTenantId) {
    throw new AuthorizationError('Cross-tenant guarantor access forbidden.');
  }
  const canonicalRole = normalizeCapabilityRole(req.user?.role);
  if (canonicalRole === 'MEMBER_PORTAL') {
    throw new AuthorizationError('Borrower accounts cannot inspect guarantor dossiers.');
  }
  if (canonicalRole === 'GUARANTOR_PORTAL' && guarantor.userId !== req.user?.id) {
    throw new AuthorizationError('Guarantors may only view and sign their own surety dossier.');
  }
  if (requireSelfOrStaff && canonicalRole === 'GUARANTOR_PORTAL' && guarantor.userId !== req.user?.id) {
    throw new AuthorizationError('Unauthorized guarantor modification.');
  }
  return guarantor;
}

async function create(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || req.body?.tenantId || null;
    const guarantor = await guarantorService.create({ ...req.body, tenantId });
    return created(res, guarantor, 'Guarantor registered with GPS address');
  } catch (err) { next(err); }
}

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20, search = '', includeHidden } = req.query;
    const tenantId = req.tenantId || req.user?.tenantId || null;
    const result = await guarantorService.getAll({
      page: +page,
      limit: +limit,
      search,
      includeHidden: includeHidden === 'true',
      tenantId,
    });
    return paginated(res, result.data, result.pagination);
  } catch (err) { next(err); }
}

async function getMyGuarantees(req, res, next) {
  try {
    const guarantees = await guarantorService.getMyGuarantees(req.user.id);
    return success(res, guarantees);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const guarantor = await assertGuarantorAccess(req, req.params.id);
    return success(res, guarantor);
  } catch (err) { next(err); }
}

async function getLoansByGuarantor(req, res, next) {
  try {
    const guarantor = await assertGuarantorAccess(req, req.params.id);
    const loans = await guarantorService.getLoans(guarantor.id);
    return success(res, loans);
  } catch (err) { next(err); }
}

async function signAgreement(req, res, next) {
  try {
    const guarantor = await assertGuarantorAccess(req, req.params.id);
    const result = await guarantorService.signAgreement(guarantor.id);
    return success(res, result, 'Agreement signed');
  } catch (err) { next(err); }
}

async function togglePenaltyNotifications(req, res, next) {
  try {
    const guarantor = await assertGuarantorAccess(req, req.params.id);
    const result = await guarantorService.togglePenaltyNotifications(guarantor.id, req.body.enabled);
    return success(res, result);
  } catch (err) { next(err); }
}

module.exports = { create, getAll, getMyGuarantees, getById, getLoansByGuarantor, signAgreement, togglePenaltyNotifications };
