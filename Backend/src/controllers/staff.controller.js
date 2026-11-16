const staffService = require('../services/staff.service');
const attendanceService = require('../services/attendance.service');
const { success, created, paginated } = require('../utils/response');

async function getAll(req, res, next) {
  try {
    const { page = 1, limit = 50, search = null, includeHidden = 'false' } = req.query;
    const result = await staffService.getAll({
      page: +page,
      limit: +limit,
      tenantId: req.tenantId || req.user?.tenantId || null,
      search: search || null,
      includeHidden: includeHidden === 'true',
    });
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
    const staff = await staffService.create({
      ...req.body,
      tenantId: req.tenantId || req.user?.tenantId || req.body?.tenantId || null,
    });
    return created(res, staff);
  } catch (err) { next(err); }
}

async function registerStaff(req, res, next) {
  try {
    const staff = await staffService.registerStaffUser(req.user, {
      ...req.body,
      tenantId: req.tenantId || req.user?.tenantId,
    });
    return created(
      res,
      staff,
      staff.requiresOwnerApproval
        ? 'Staff created and queued for Company Owner approval.'
        : `Staff ${staff.user?.firstName} ${staff.user?.lastName} (${staff.user?.role}) created & activated.`
    );
  } catch (err) { next(err); }
}

async function getPendingApprovals(req, res, next) {
  try {
    const list = await staffService.getPendingStaffApprovals(req.tenantId || req.user?.tenantId, req.user);
    return success(res, list);
  } catch (err) { next(err); }
}

async function ownerApproveStaff(req, res, next) {
  try {
    const updated = await staffService.ownerApproveStaff(req.user, req.params.id, req.body);
    return success(res, updated, 'Employment request approved by Company Owner. Now awaiting Branch Manager final approval.');
  } catch (err) { next(err); }
}

async function branchApproveStaff(req, res, next) {
  try {
    const updated = await staffService.branchApproveStaff(req.user, req.params.id, req.body);
    return success(res, updated, 'Staff employed and activated successfully by Branch Manager.');
  } catch (err) { next(err); }
}

async function getBranchApprovedStaff(req, res, next) {
  try {
    const list = await staffService.getBranchApprovedStaff(req.tenantId || req.user?.tenantId, req.query);
    return success(res, list);
  } catch (err) { next(err); }
}

async function verifyEmployment(req, res, next) {
  try {
    const result = await staffService.verifyEmployment(req.user, req.params.id, req.body);
    return success(res, result, 'Employee dossier verified and acknowledged by Company Owner.');
  } catch (err) { next(err); }
}

async function approveStaff(req, res, next) {
  try {
    const approved = req.body?.approve !== false;
    const updated = await staffService.approveStaffAccount(req.user, req.params.id, {
      approve: approved,
      notes: req.body?.notes || '',
    });
    return success(res, updated, approved ? 'Staff account approved & activated' : 'Staff account suspended');
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

async function clockIn(req, res, next) {
  try {
    const result = await attendanceService.recordClockIn(req.user.id, req.body || {});
    return success(
      res,
      result,
      result.alreadyClockedIn ? 'Already clocked in for current shift' : 'Clocked in successfully'
    );
  } catch (err) { next(err); }
}

async function clockOut(req, res, next) {
  try {
    const updated = await attendanceService.recordClockOut(req.user.id, req.body || {});
    return success(res, updated, `Clocked out (${updated.durationMinutes} min shift logged)`);
  } catch (err) { next(err); }
}

async function myAttendance(req, res, next) {
  try {
    const status = await attendanceService.getMyTodayStatus(req.user.id);
    return success(res, status);
  } catch (err) { next(err); }
}

async function getAttendanceLogs(req, res, next) {
  try {
    const logs = await attendanceService.getAttendanceLogs({
      tenantId: req.tenantId || req.user?.tenantId || null,
      shiftDate: req.query.shiftDate || null,
      limit: req.query.limit || 100,
    });
    return success(res, logs);
  } catch (err) { next(err); }
}

module.exports = {
  getAll,
  getById,
  create,
  registerStaff,
  getPendingApprovals,
  ownerApproveStaff,
  branchApproveStaff,
  getBranchApprovedStaff,
  verifyEmployment,
  approveStaff,
  update,
  deactivate,
  clockIn,
  clockOut,
  myAttendance,
  getAttendanceLogs,
};
