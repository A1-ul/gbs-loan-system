const memberService = require('../services/member.service');
const { success, created, paginated } = require('../utils/response');
const { AuthorizationError } = require('../utils/errors');
const { normalizeCapabilityRole, hasRoleAction } = require('../constants/roleCapabilities');

function assertMemberAccess(req, member) {
  const canonicalRole = normalizeCapabilityRole(req.user?.role);
  if (canonicalRole === 'GUARANTOR_PORTAL') {
    throw new AuthorizationError('Guarantor portals cannot inspect arbitrary borrower files.');
  }
  if (canonicalRole === 'MEMBER_PORTAL') {
    if (member.userId !== req.user?.id) {
      throw new AuthorizationError('Borrowers may only view or update their own profile.');
    }
    return;
  }
  if (!hasRoleAction(req.user?.role, 'canViewCustomerDirectory')) {
    throw new AuthorizationError(`Role '${req.user?.role}' cannot inspect borrower directory records.`);
  }
}

async function create(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || req.body?.tenantId;
    const member = await memberService.create({ ...req.body, tenantId });
    return created(res, member);
  } catch (err) {
    next(err);
  }
}

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 20, search, status, includeHidden } = req.query;
    const tenantId = req.tenantId || req.user?.tenantId;
    const result = await memberService.getAll({
      page: +page,
      limit: +limit,
      search,
      status,
      tenantId,
      includeHidden: includeHidden === 'true',
    });
    return paginated(res, result.data, result.pagination);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const member = await memberService.getById(req.params.id, tenantId);
    assertMemberAccess(req, member);
    return success(res, member);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const existing = await memberService.getById(req.params.id, tenantId);
    assertMemberAccess(req, existing);
    const member = await memberService.update(existing.id, req.body);
    return success(res, member, 'Member updated');
  } catch (err) {
    next(err);
  }
}

async function getStats(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const stats = await memberService.getStats(tenantId);
    return success(res, stats);
  } catch (err) {
    next(err);
  }
}

async function verifyGhanaCard(req, res, next) {
  try {
    const result = await memberService.verifyGhanaCard(req.params.id);
    return success(res, result, 'Ghana Card verified');
  } catch (err) {
    next(err);
  }
}

async function uploadProfilePicture(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const result = await memberService.uploadProfilePicture(req.params.id, req.file, tenantId);
    return success(res, result, 'Profile picture uploaded');
  } catch (err) {
    next(err);
  }
}

async function getMyProfile(req, res, next) {
  try {
    const member = await memberService.getByUserId(req.user.id);
    return success(res, member);
  } catch (err) {
    next(err);
  }
}

async function requestDeletion(req, res, next) {
  try {
    const { reason } = req.body;
    const tenantId = req.tenantId || req.user?.tenantId;
    const result = await memberService.requestMemberDeletion(req.params.id, reason, req.user?.id, tenantId);
    return success(res, result.data, result.message);
  } catch (err) {
    next(err);
  }
}

async function approveDeletion(req, res, next) {
  try {
    const managerId = req.user?.id || 'MANAGER';
    const tenantId = req.tenantId || req.user?.tenantId;
    const result = await memberService.approveMemberDeletion(req.params.id, managerId, tenantId);
    return success(res, null, result.message);
  } catch (err) {
    next(err);
  }
}

async function rejectDeletion(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const result = await memberService.rejectMemberDeletion(req.params.id, req.user?.id, tenantId);
    return success(res, null, result.message);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  getAll,
  getById,
  getMyProfile,
  update,
  getStats,
  verifyGhanaCard,
  uploadProfilePicture,
  requestDeletion,
  approveDeletion,
  rejectDeletion,
};
