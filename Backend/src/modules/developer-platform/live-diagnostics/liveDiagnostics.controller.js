const service = require('./liveDiagnostics.service');

const runDiagnostics = async (req, res, next) => {
  try {
    const report = await service.runFullDiagnostic();
    res.json({ success: true, report });
  } catch (err) {
    next(err);
  }
};

module.exports = { runDiagnostics };
