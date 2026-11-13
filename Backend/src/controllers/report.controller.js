const reportService = require('../services/report.service');
const { success } = require('../utils/response');

async function generate(req, res, next) {
  try {
    const report = await reportService.generate(req.body, req.user.id);
    return success(res, report);
  } catch (err) { next(err); }
}

async function loanReport(req, res, next) {
  try {
    const report = await reportService.loanReport(req.query);
    return success(res, report);
  } catch (err) { next(err); }
}

async function paymentReport(req, res, next) {
  try {
    const report = await reportService.paymentReport(req.query);
    return success(res, report);
  } catch (err) { next(err); }
}

async function collectionReport(req, res, next) {
  try {
    const report = await reportService.collectionReport(req.query);
    return success(res, report);
  } catch (err) { next(err); }
}

async function staffReport(req, res, next) {
  try {
    const report = await reportService.staffReport(req.query);
    return success(res, report);
  } catch (err) { next(err); }
}

async function guarantorReport(req, res, next) {
  try {
    const report = await reportService.guarantorReport(req.query);
    return success(res, report);
  } catch (err) { next(err); }
}

async function outstandingReport(req, res, next) {
  try {
    const report = await reportService.outstandingReport(req.query);
    return success(res, report);
  } catch (err) { next(err); }
}

async function getReportsOverview(req, res, next) {
  try {
    return success(res, {
      availableReports: [
        'loan',
        'payment',
        'collection',
        'staff',
        'guarantor',
        'outstanding',
      ],
      engine: 'GBS Enterprise Reporting Engine (PDF, Excel, CSV)',
      status: 'ACTIVE',
    });
  } catch (err) { next(err); }
}

module.exports = {
  generate, loanReport, paymentReport, collectionReport,
  staffReport, guarantorReport, outstandingReport, getReportsOverview,
};
