const service = require('./deploymentHistory.service');

const getDeployments = async (req, res, next) => {
  try {
    const data = await service.getDeployments();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const recordDeployment = async (req, res, next) => {
  try {
    const result = await service.recordDeployment(req.body, req.developer);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getDeployments, recordDeployment };
