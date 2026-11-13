const gpsService = require('../services/gps.service');
const { emitToDeveloper, emitToTenant } = require('../config/socket');
const { success, created } = require('../utils/response');

async function updateLocation(req, res, next) {
  try {
    const log = await gpsService.updateLocation(req.user.id, req.body);
    const payload = {
      collectorId: log.collectorId,
      tenantId: req.user?.tenantId || null,
      latitude: log.latitude,
      longitude: log.longitude,
      speed: log.speed,
      status: log.status,
      recordedAt: log.recordedAt,
    };
    emitToDeveloper('collector:location_update', payload);
    if (req.user?.tenantId) emitToTenant(req.user.tenantId, 'collector:location_update', payload);
    return success(res, log);
  } catch (err) { next(err); }
}

async function batchSync(req, res, next) {
  try {
    const result = await gpsService.batchSync(req.user.id, req.body.locations);
    return success(res, result, 'Locations synced');
  } catch (err) { next(err); }
}

async function getTrackingData(req, res, next) {
  try {
    const data = await gpsService.getTrackingData(req.params.collectorId);
    return success(res, data);
  } catch (err) { next(err); }
}

async function grantConsent(req, res, next) {
  try {
    await gpsService.grantConsent(req.user.id, req.ip);
    return success(res, null, 'GPS tracking consent granted');
  } catch (err) { next(err); }
}

async function revokeConsent(req, res, next) {
  try {
    await gpsService.revokeConsent(req.user.id);
    return success(res, null, 'GPS tracking consent revoked');
  } catch (err) { next(err); }
}

async function shareMyLocation(req, res, next) {
  try {
    const loc = await gpsService.shareMyLocation(req.user.id, req.body);
    emitToDeveloper('gps:live_update', loc);
    if (req.user?.tenantId) {
      emitToTenant(req.user.tenantId, 'gps:live_update', loc);
      emitToTenant(req.user.tenantId, 'collector:location_update', {
        ...loc,
        latitude: loc.coordinates.latitude,
        longitude: loc.coordinates.longitude,
      });
    }
    return success(res, loc, 'Live GPS coordinates synchronized');
  } catch (err) { next(err); }
}

async function locateByPhone(req, res, next) {
  try {
    const phone = req.query.phone || '';
    const tenantId = req.tenantId || req.user?.tenantId || null;
    const result = await gpsService.locateByPhone({ phone, tenantId, allowCrossTenant: false });
    return success(res, result, result.totalMatches > 0 ? 'Location resolved for mobile number' : 'No registered account matches this mobile number');
  } catch (err) { next(err); }
}

module.exports = { updateLocation, batchSync, getTrackingData, grantConsent, revokeConsent, shareMyLocation, locateByPhone };
