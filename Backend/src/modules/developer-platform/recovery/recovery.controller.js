const service = require('./recovery.service');

const getPlan = async (req, res, next) => {
  try {
    const data = await service.getRecoveryPlan();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const triggerFailover = async (req, res, next) => {
  try {
    const result = await service.executeFailover(req.body?.scenario, req.developer);
    res.json({ success: true, message: 'Disaster recovery protocol executed', data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPlan, triggerFailover };
