const assistantService = require('./assistant.service');
const logger = require('../../utils/logger');

async function analyzeCrash(req, res, next) {
  try {
    const { errorMessage, stackTrace } = req.body;
    if (!errorMessage) {
      return res.status(400).json({ success: false, message: 'errorMessage parameter is required.' });
    }

    const analysis = await assistantService.analyzeErrorLog(errorMessage, stackTrace);
    return res.status(200).json({
      success: true,
      message: 'AI Crash analysis completed',
      data: analysis,
    });
  } catch (error) {
    logger.error('AI Crash analysis controller error:', error);
    next(error);
  }
}

async function checkStructure(req, res, next) {
  try {
    const report = await assistantService.verifyBlueprintStructure();
    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Blueprint structure check error:', error);
    next(error);
  }
}

async function getArchitectureReport(req, res, next) {
  try {
    const report = await assistantService.generateArchitectureReport();
    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    logger.error('Architecture report error:', error);
    next(error);
  }
}

module.exports = {
  analyzeCrash,
  checkStructure,
  getArchitectureReport,
};
