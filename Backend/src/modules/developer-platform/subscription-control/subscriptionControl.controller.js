const service = require('./subscriptionControl.service');

const getSubscription = async (req, res, next) => {
  try {
    const tenantId = req.params.tenantId || req.query.tenantId;
    const data = tenantId
      ? await service.getTenantSubscription(tenantId)
      : await service.listSubscriptions();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const updateSubscription = async (req, res, next) => {
  try {
    const tenantId = req.params.tenantId || req.body?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ success: false, message: 'tenantId is required' });
    }
    const updated = await service.updateSubscription(tenantId, req.body);
    res.json({ success: true, message: 'Subscription updated', data: updated });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSubscription, updateSubscription };
