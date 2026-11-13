const service = require('./crashReports.service');

const getCrashReports = async (req, res, next) => {
  try {
    const data = await service.getRecentCrashes(parseInt(req.query.limit, 10) || 50);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const recordCrash = async (req, res, next) => {
  try {
    const report = await service.logCrash(req.body);
    res.status(201).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCrashReports, recordCrash };
