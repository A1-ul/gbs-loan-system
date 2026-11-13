const meetingService = require('../services/meeting.service');
const { success, created } = require('../utils/response');

async function getAll(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const meetings = await meetingService.getAll(tenantId);
    return success(res, meetings);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId;
    const meeting = await meetingService.create(req.user, req.body, tenantId);
    return created(res, meeting, 'Online meeting scheduled and invitations dispatched');
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const meeting = await meetingService.getById(req.params.id);
    return success(res, meeting);
  } catch (err) { next(err); }
}

async function cancel(req, res, next) {
  try {
    await meetingService.cancel(req.params.id);
    return success(res, null, 'Meeting cancelled');
  } catch (err) { next(err); }
}

module.exports = { getAll, create, getById, cancel };
