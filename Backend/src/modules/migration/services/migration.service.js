const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const { parse: parseCsv } = require('csv-parse/sync');
const { prisma } = require('../../../config/database');
const { getMigrationQueue, registerMigrationProcessor } = require('../../../queues/migration.queue');
const { getRecordProvenance } = require('../../../config/environments');
const { ValidationError, NotFoundError } = require('../../../utils/errors');
const logger = require('../../../utils/logger');

/**
 * Parse uploaded Excel (.xlsx/.xls), CSV, or JSON file into normalized JSON rows + headers
 */
function parseMigrationFile(filePath, originalName) {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new ValidationError('Uploaded migration file not found on disk');
  }
  const ext = path.extname(originalName || filePath).toLowerCase();
  let rows = [];

  if (ext === '.xlsx' || ext === '.xls') {
    const workbook = XLSX.readFile(filePath);
    const firstSheet = workbook.SheetNames[0];
    rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '' });
  } else if (ext === '.csv') {
    const rawCsv = fs.readFileSync(filePath, 'utf8');
    rows = parseCsv(rawCsv, { columns: true, skip_empty_lines: true, trim: true });
  } else if (ext === '.json') {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    rows = Array.isArray(parsed) ? parsed : (parsed.records || []);
  } else {
    throw new ValidationError(`Unsupported file extension: ${ext}`);
  }

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

function normalizePhone(phone) {
  if (!phone) return null;
  let clean = String(phone).replace(/[^\d+]/g, '');
  if (!clean.startsWith('+') && clean.startsWith('0')) clean = `+233${clean.slice(1)}`;
  else if (!clean.startsWith('+') && clean.length >= 9) clean = `+233${clean}`;
  return clean;
}

/**
 * Initialize Migration Job & inspect uploaded file if provided
 */
async function createMigrationJob(jobType, fileName, createdById, { tenantId = null, targetEntity = 'MEMBERS', filePath = null } = {}) {
  let totalRecords = 0;
  let preview = [];
  let headers = [];

  if (filePath) {
    const parsed = parseMigrationFile(filePath, fileName);
    totalRecords = parsed.rows.length;
    headers = parsed.headers;
    preview = parsed.rows.slice(0, 10);
  }

  const job = await prisma.migrationJob.create({
    data: {
      tenantId,
      jobType: jobType || 'EXCEL_IMPORT',
      targetEntity: (targetEntity || 'MEMBERS').toUpperCase(),
      fileName: fileName || 'batch_import_data.csv',
      totalRecords,
      status: filePath ? 'VALIDATED_READY' : 'PENDING',
      createdById: createdById || null,
      columnMapping: headers.length > 0 ? { detectedColumns: headers } : null,
    },
  });

  logger.info(`Migration job initialized: ID ${job.id}, Entity=${job.targetEntity}, Records=${totalRecords}`);
  return { job, headers, preview };
}

/**
 * Execute real batch PostgreSQL ingestion for MEMBERS, LOANS, or PAYMENTS with duplicate detection + audit + rollback tracking
 */
async function processBatchMigration(jobId, records = [], { targetEntity = null, tenantId = null, adminId = null } = {}) {
  const job = await prisma.migrationJob.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new NotFoundError(`Migration Job '${jobId}'`);
  }

  const entityMode = (targetEntity || job.targetEntity || 'MEMBERS').toUpperCase();
  const effectiveTenantId = tenantId || job.tenantId || null;

  await prisma.migrationJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING' },
  });

  let processedCount = 0;
  let failedCount = 0;
  const errors = [];
  const importedIds = Array.isArray(job.importedIds) ? [...job.importedIds] : [];
  const defaultPasswordHash = await bcrypt.hash('GbsMigrated@2026!', 10);

  for (let idx = 0; idx < records.length; idx++) {
    const record = records[idx];
    try {
      if (entityMode === 'MEMBERS') {
        const email = String(record.email || '').trim().toLowerCase();
        const phone = normalizePhone(record.phone || record.phoneNumber);
        if (!email || !phone) {
          throw new Error('Member row requires valid email and phone');
        }

        const existing = await prisma.user.findFirst({
          where: { OR: [{ email }, { phone }] },
        });
        if (existing) {
          failedCount++;
          errors.push({ row: idx + 1, record, reason: 'Duplicate user email or phone detected in PostgreSQL.' });
          continue;
        }

        const fullName = String(record.name || `${record.firstName || ''} ${record.lastName || ''}`).trim();
        const parts = (fullName || 'Migrated Member').split(/\s+/);
        const memberNum = record.memberNumber || `MBR-MIG-${Date.now().toString().slice(-6)}-${idx + 1}`;

        const created = await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              tenantId: effectiveTenantId,
              email,
              phone,
              passwordHash: defaultPasswordHash,
              role: 'MEMBER_PORTAL',
              status: 'ACTIVE',
              firstName: record.firstName || parts[0] || 'Migrated',
              lastName: record.lastName || parts.slice(1).join(' ') || 'Member',
              address: record.address || null,
              ...getRecordProvenance('MIGRATED_IMPORT'),
            },
          });

          const member = await tx.member.create({
            data: {
              tenantId: effectiveTenantId,
              userId: user.id,
              memberNumber: memberNum,
              ghanaCardNumber: record.ghanaCardNumber || null,
              occupation: record.occupation || 'Self Employed',
              employer: record.employer || 'Migrated Import',
              monthlyIncome: record.monthlyIncome ? parseFloat(record.monthlyIncome) : null,
              ...getRecordProvenance('MIGRATED_IMPORT'),
            },
          });
          return { userId: user.id, memberId: member.id };
        });

        importedIds.push({ type: 'MEMBER_USER', userId: created.userId, memberId: created.memberId });
        processedCount++;
      } else if (entityMode === 'LOANS') {
        const principal = parseFloat(record.principalAmount || record.amount || record.principal);
        if (!principal || principal <= 0) throw new Error('Loan row requires positive principalAmount');

        const member = await prisma.member.findFirst({
          where: {
            OR: [
              record.memberId ? { id: record.memberId } : undefined,
              record.memberNumber ? { memberNumber: record.memberNumber } : undefined,
            ].filter(Boolean),
          },
        });
        if (!member) throw new Error(`Target member not found for loan row (${record.memberNumber || record.memberId})`);

        const rate = parseFloat(record.interestRate || 14.0);
        const termMonths = parseInt(record.termMonths || record.tenureMonths || 12, 10);
        const totalInterest = Number(((principal * rate * (termMonths / 12)) / 100).toFixed(2));
        const totalAmount = Number((principal + totalInterest).toFixed(2));
        const loanNumber = record.loanNumber || `LN-MIG-${Date.now().toString().slice(-6)}-${idx + 1}`;

        const loan = await prisma.loan.create({
          data: {
            tenantId: effectiveTenantId || member.tenantId,
            loanNumber,
            memberId: member.id,
            purpose: record.purpose || 'Migrated Legacy Portfolio',
            principalAmount: principal,
            interestRate: rate,
            penaltyRate: parseFloat(record.penaltyRate || 2.0),
            termMonths,
            totalAmount,
            amountPaid: parseFloat(record.amountPaid || 0),
            outstandingAmount: parseFloat(record.outstandingAmount ?? totalAmount),
            status: record.status || 'APPROVED',
            ...getRecordProvenance('MIGRATED_IMPORT'),
          },
        });

        importedIds.push({ type: 'LOAN', loanId: loan.id });
        processedCount++;
      } else if (entityMode === 'PAYMENTS') {
        const amount = parseFloat(record.amount);
        if (!amount || amount <= 0) throw new Error('Payment row requires positive amount');

        const loan = await prisma.loan.findFirst({
          where: {
            OR: [
              record.loanId ? { id: record.loanId } : undefined,
              record.loanNumber ? { loanNumber: record.loanNumber } : undefined,
            ].filter(Boolean),
          },
        });
        if (!loan) throw new Error(`Target loan not found (${record.loanNumber || record.loanId})`);

        const receiptNumber = record.receiptNumber || `RCP-MIG-${Date.now().toString().slice(-6)}-${idx + 1}`;
        const paymentRef = record.paymentRef || `PAY-MIG-${Date.now().toString().slice(-6)}-${idx + 1}`;
        const payment = await prisma.payment.create({
          data: {
            tenantId: effectiveTenantId || loan.tenantId,
            paymentRef,
            loanId: loan.id,
            amount,
            method: record.method || record.paymentMethod || 'BANK_TRANSFER',
            status: 'CONFIRMED',
            receiptNumber,
            paidAt: record.paidAt || record.paymentDate ? new Date(record.paidAt || record.paymentDate) : new Date(),
            ...getRecordProvenance('MIGRATED_IMPORT'),
          },
        });

        importedIds.push({ type: 'PAYMENT', paymentId: payment.id });
        processedCount++;
      } else {
        throw new Error(`Unsupported target entity mode: ${entityMode}`);
      }
    } catch (err) {
      failedCount++;
      errors.push({ row: idx + 1, record, reason: err.message });
    }
  }

  const updatedJob = await prisma.migrationJob.update({
    where: { id: jobId },
    data: {
      totalRecords: records.length,
      processedRecords: processedCount,
      failedRecords: failedCount,
      importedIds,
      status: failedCount === 0 ? 'COMPLETED' : 'COMPLETED_WITH_ERRORS',
      errorLog: errors.length > 0 ? errors : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: effectiveTenantId,
      userId: adminId || job.createdById || null,
      action: 'MIGRATION_EXECUTED',
      entityType: 'MIGRATION_JOB',
      entityId: jobId,
      metadata: { targetEntity: entityMode, processedCount, failedCount },
      ...getRecordProvenance(),
    },
  }).catch(() => {});

  return updatedJob;
}

async function enqueueBatchMigration(jobId, records, options = {}) {
  const queue = getMigrationQueue();
  if (!queue) {
    return processBatchMigration(jobId, records, options);
  }
  const bullJob = await queue.add({ jobId, records, options });
  return { queued: true, bullJobId: bullJob.id, migrationJobId: jobId };
}

/**
 * Rollback a completed migration job by deleting records created during that job
 */
async function rollbackMigrationJob(jobId, adminId = null) {
  const job = await prisma.migrationJob.findUnique({ where: { id: jobId } });
  if (!job) throw new NotFoundError(`Migration Job '${jobId}'`);
  if (job.rolledBack) {
    throw new ValidationError('This migration job has already been rolled back');
  }

  const imported = Array.isArray(job.importedIds) ? job.importedIds : [];
  let deletedCount = 0;

  for (const item of imported.reverse()) {
    try {
      if (item.type === 'PAYMENT' && item.paymentId) {
        await prisma.payment.delete({ where: { id: item.paymentId } });
        deletedCount++;
      } else if (item.type === 'LOAN' && item.loanId) {
        await prisma.loan.delete({ where: { id: item.loanId } });
        deletedCount++;
      } else if (item.type === 'MEMBER_USER' && item.userId) {
        await prisma.user.delete({ where: { id: item.userId } });
        deletedCount++;
      }
    } catch (err) {
      logger.warn(`Rollback warning for item ${JSON.stringify(item)}: ${err.message}`);
    }
  }

  const rolledBackJob = await prisma.migrationJob.update({
    where: { id: jobId },
    data: { rolledBack: true, status: 'ROLLED_BACK' },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: job.tenantId,
      userId: adminId || job.createdById || null,
      action: 'MIGRATION_EXECUTED',
      entityType: 'MIGRATION_JOB',
      entityId: jobId,
      metadata: { action: 'ROLLBACK', deletedCount },
      ...getRecordProvenance(),
    },
  }).catch(() => {});

  return { job: rolledBackJob, deletedCount };
}

async function getJobStatus(jobId) {
  return prisma.migrationJob.findUnique({ where: { id: jobId } });
}

async function listMigrationJobs(tenantId = null) {
  return prisma.migrationJob.findMany({
    where: tenantId ? { tenantId } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 30,
  });
}

// Register Bull queue worker processor safely
try {
  registerMigrationProcessor(processBatchMigration);
} catch (err) {
  logger.warn(`Could not auto-register migration worker: ${err.message}`);
}

module.exports = {
  parseMigrationFile,
  createMigrationJob,
  processBatchMigration,
  enqueueBatchMigration,
  rollbackMigrationJob,
  getJobStatus,
  listMigrationJobs,
};
