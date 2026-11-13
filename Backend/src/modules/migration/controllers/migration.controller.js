const migrationService = require('../services/migration.service');
const logger = require('../../../utils/logger');

async function createJob(req, res, next) {
  try {
    const { jobType, fileName, targetEntity } = req.body;
    const createdById = req.user?.id || null;
    const tenantId = req.tenantId || req.user?.tenantId || null;

    const result = await migrationService.createMigrationJob(jobType, fileName, createdById, {
      tenantId,
      targetEntity,
    });
    return res.status(201).json({
      success: true,
      message: 'Migration job created successfully',
      data: result.job,
    });
  } catch (error) {
    logger.error('Error creating migration job:', error);
    next(error);
  }
}

async function uploadAndAnalyze(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Migration file (.xlsx, .csv, or .json) is required' });
    }
    const { targetEntity = 'MEMBERS', jobType = 'FILE_UPLOAD' } = req.body;
    const createdById = req.user?.id || null;
    const tenantId = req.tenantId || req.user?.tenantId || null;

    const result = await migrationService.createMigrationJob(jobType, req.file.originalname, createdById, {
      tenantId,
      targetEntity,
      filePath: req.file.path,
    });

    const parsed = migrationService.parseMigrationFile(req.file.path, req.file.originalname);

    // Optional instant execution if autoExecute=true
    if (req.body.autoExecute === 'true' || req.body.autoExecute === true) {
      const executed = await migrationService.processBatchMigration(result.job.id, parsed.rows, {
        targetEntity,
        tenantId,
        adminId: createdById,
      });
      return res.status(201).json({
        success: true,
        message: `Migration uploaded and executed (${executed.processedRecords} imported, ${executed.failedRecords} failed)`,
        data: executed,
        headers: result.headers,
        preview: result.preview,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Migration file parsed and validated for review',
      data: result.job,
      headers: result.headers,
      preview: result.preview,
      records: parsed.rows,
    });
  } catch (error) {
    logger.error('Error uploading migration file:', error);
    next(error);
  }
}

async function processBatch(req, res, next) {
  try {
    const { jobId } = req.params;
    const { records, targetEntity, asyncMode } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'records must be an array' });
    }

    const options = {
      targetEntity,
      tenantId: req.tenantId || req.user?.tenantId || null,
      adminId: req.user?.id || null,
    };

    const result = asyncMode
      ? await migrationService.enqueueBatchMigration(jobId, records, options)
      : await migrationService.processBatchMigration(jobId, records, options);

    return res.status(200).json({
      success: true,
      message: asyncMode ? 'Migration batch queued via Bull worker' : 'Migration batch processed',
      data: result,
    });
  } catch (error) {
    logger.error('Error processing migration batch:', error);
    next(error);
  }
}

async function rollbackJob(req, res, next) {
  try {
    const result = await migrationService.rollbackMigrationJob(req.params.jobId, req.user?.id || null);
    return res.status(200).json({
      success: true,
      message: `Migration rolled back (${result.deletedCount} records reverted)`,
      data: result.job,
    });
  } catch (error) {
    next(error);
  }
}

async function getJob(req, res, next) {
  try {
    const { jobId } = req.params;
    const job = await migrationService.getJobStatus(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Migration job not found' });
    }
    return res.status(200).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
}

async function listJobs(req, res, next) {
  try {
    const tenantId = req.tenantId || req.user?.tenantId || null;
    const jobs = await migrationService.listMigrationJobs(tenantId);
    return res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createJob,
  uploadAndAnalyze,
  processBatch,
  rollbackJob,
  getJob,
  listJobs,
};
