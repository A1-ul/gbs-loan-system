const service = require('./remoteMonitoring.service');

const getMetrics = async (req, res, next) => {
  try {
    const data = await service.getSystemMetrics();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getHeartbeat = async (req, res, next) => {
  try {
    const data = await service.getHeartbeat();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMetrics, getHeartbeat };
