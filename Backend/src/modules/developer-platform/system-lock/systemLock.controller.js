const service = require('./systemLock.service');

const getStatus = async (req, res, next) => {
  try {
    const data = await service.getLockStatus();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const lock = async (req, res, next) => {
  try {
    const result = await service.lockSystem(req.body?.reason, req.developer);
    res.json({ success: true, message: 'System locked globally across tenant portals', data: result });
  } catch (err) {
    next(err);
  }
};

const unlock = async (req, res, next) => {
  try {
    const result = await service.unlockSystem(req.developer);
    res.json({ success: true, message: 'System unlocked and operational', data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStatus, lock, unlock };
