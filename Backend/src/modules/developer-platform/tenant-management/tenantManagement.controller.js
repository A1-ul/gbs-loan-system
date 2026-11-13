const service = require('./tenantManagement.service');

const getTenants = async (req, res, next) => {
  try {
    const data = await service.getTenants(req.query.onboardingStatus || null);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getPendingTenants = async (req, res, next) => {
  try {
    const data = await service.getPendingTenants();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getTenantById = async (req, res, next) => {
  try {
    const tenant = await service.getTenantById(req.params.id);
    res.json({ success: true, data: tenant });
  } catch (err) {
    next(err);
  }
};

const createTenant = async (req, res, next) => {
  try {
    const tenant = await service.createTenant(req.body, req.developer?.id || null);
    res.status(201).json({ success: true, message: 'Tenant provisioned and approved', data: tenant });
  } catch (err) {
    next(err);
  }
};

const approveTenant = async (req, res, next) => {
  try {
    const tenant = await service.approveTenant(req.params.id, req.developer?.id, req.body || {});
    res.json({ success: true, message: `Tenant ${tenant.name} approved and activated`, data: tenant });
  } catch (err) {
    next(err);
  }
};

const rejectTenant = async (req, res, next) => {
  try {
    const tenant = await service.rejectTenant(req.params.id, req.developer?.id, req.body?.reason);
    res.json({ success: true, message: `Tenant ${tenant.name} rejected`, data: tenant });
  } catch (err) {
    next(err);
  }
};

const lockTenant = async (req, res, next) => {
  try {
    const result = await service.lockTenant(req.params.id, req.body?.reason, req.developer?.id || null);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const unlockTenant = async (req, res, next) => {
  try {
    const planOrDays = req.body?.planCode || parseInt(req.body?.extensionDays, 10) || 30;
    const result = await service.unlockTenant(
      req.params.id,
      planOrDays,
      req.body?.note || 'Developer authorized unlock',
      req.developer?.id || null
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const bulkLockTenants = async (req, res, next) => {
  try {
    const result = await service.bulkLockTenants(req.body?.tenantIds, req.body?.reason, req.developer?.id || null);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const bulkUnlockTenants = async (req, res, next) => {
  try {
    const planOrDays = req.body?.planCode || parseInt(req.body?.extensionDays, 10) || 30;
    const result = await service.bulkUnlockTenants(
      req.body?.tenantIds,
      planOrDays,
      req.body?.note,
      req.developer?.id || null
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const deleteTenant = async (req, res, next) => {
  try {
    const result = await service.deleteTenant(req.params.id, req.developer?.id || null);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

const renewTenant = async (req, res, next) => {
  try {
    const planOrDays = req.body?.planCode || parseInt(req.body?.extensionDays, 10) || 30;
    const result = await service.renewTenant(
      req.params.id,
      planOrDays,
      req.body?.note,
      req.developer?.id || null
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTenants,
  getPendingTenants,
  getTenantById,
  createTenant,
  approveTenant,
  rejectTenant,
  lockTenant,
  unlockTenant,
  bulkLockTenants,
  bulkUnlockTenants,
  deleteTenant,
  renewTenant,
};
