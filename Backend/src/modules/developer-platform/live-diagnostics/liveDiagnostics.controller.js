const service = require('./liveDiagnostics.service');

const runDiagnostics = async (req, res, next) => {
  try {
    const report = await service.runFullDiagnostic();
    res.json({ success: true, data: report, report });
  } catch (err) {
    next(err);
  }
};

module.exports = { runDiagnostics };
