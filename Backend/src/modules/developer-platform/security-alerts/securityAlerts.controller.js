const service = require('./securityAlerts.service');

const getAlerts = async (req, res, next) => {
  try {
    const data = await service.getActiveAlerts();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const triggerAlert = async (req, res, next) => {
  try {
    const alert = await service.createAlert({ ...req.body, ipAddress: req.ip });
    res.status(201).json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
};

const resolveAlert = async (req, res, next) => {
  try {
    const updated = await service.resolveAlert(req.params.id, req.developer);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAlerts, triggerAlert, resolveAlert };
