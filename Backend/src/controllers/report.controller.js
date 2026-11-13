const reportService = require('../services/report.service');
const { NotFoundError } = require('../utils/errors');
const { success, created } = require('../utils/response');

const getScope = (req) => req.tenantId || req.user?.tenantId || null;

async function generate(req, res, next) {
  try {
    const report = await reportService.generate({ ...req.body, tenantId: getScope(req) }, req.user.id);
    return created(res, report, 'Report generated & saved');
  } catch (err) { next(err); }
}

async function wrapPeriodReport(req, res, next) {
  try {
    const snapshot = await reportService.wrapPeriodReport(
      {
        period: req.body?.period || req.query?.period || 'WEEKLY',
        referenceDate: req.body?.referenceDate || null,
        tenantId: getScope(req),
      },
      req.user.id
    );
    return created(res, snapshot, `${snapshot.periodType} report wrapped and archived`);
  } catch (err) { next(err); }
}

async function listSnapshots(req, res, next) {
  try {
    const snapshots = await reportService.listReports(getScope(req));
    return success(res, snapshots);
  } catch (err) { next(err); }
}

async function exportSnapshot(req, res, next) {
  try {
    const file = await reportService.exportSnapshotCsv(req.params.id, getScope(req));
    if (!file) throw new NotFoundError('Report Snapshot');
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    return res.send(file.buffer);
  } catch (err) { next(err); }
}

async function loanReport(req, res, next) {
  try {
    const report = await reportService.loanReport({ ...req.query, tenantId: getScope(req) });
    return success(res, report);
  } catch (err) { next(err); }
}

async function paymentReport(req, res, next) {
  try {
    const report = await reportService.paymentReport({ ...req.query, tenantId: getScope(req) });
    return success(res, report);
  } catch (err) { next(err); }
}

async function collectionReport(req, res, next) {
  try {
    const report = await reportService.collectionReport({ ...req.query, tenantId: getScope(req) });
    return success(res, report);
  } catch (err) { next(err); }
}

async function staffReport(req, res, next) {
  try {
    const report = await reportService.staffReport({ ...req.query, tenantId: getScope(req) });
    return success(res, report);
  } catch (err) { next(err); }
}

async function guarantorReport(req, res, next) {
  try {
    const report = await reportService.guarantorReport({ ...req.query, tenantId: getScope(req) });
    return success(res, report);
  } catch (err) { next(err); }
}

async function outstandingReport(req, res, next) {
  try {
    const report = await reportService.outstandingReport({ ...req.query, tenantId: getScope(req) });
    return success(res, report);
  } catch (err) { next(err); }
}

async function getReportsOverview(req, res, next) {
  try {
    const snapshots = await reportService.listReports(getScope(req));
    return success(res, {
      availableReports: ['loan', 'payment', 'collection', 'staff', 'guarantor', 'outstanding', 'weekly', 'monthly', 'yearly'],
      recentSnapshotsCount: snapshots.length,
      engine: 'GBS Enterprise Reporting & Period Wrapper Engine (CSV, Snapshot Archive)',
      status: 'ACTIVE',
    });
  } catch (err) { next(err); }
}

module.exports = {
  generate, wrapPeriodReport, listSnapshots, exportSnapshot,
  loanReport, paymentReport, collectionReport,
  staffReport, guarantorReport, outstandingReport, getReportsOverview,
};
