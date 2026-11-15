const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { prisma } = require('../config/database');
const config = require('../config');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

async function runBackup() {
  const backup = await prisma.systemBackup.create({
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  });

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = config.backup.storagePath;

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    let filePath = path.join(backupDir, `gbs_loan_${timestamp}.sql`);
    const cleanDbUrl = (process.env.DATABASE_URL || '').split('?')[0];

    // Resolve pg_dump binary (including standard Windows PostgreSQL 18 path)
    const winPgDump = 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe';
    let pgDumpBin = 'pg_dump';
    if (process.env.PG_DUMP_PATH && fs.existsSync(process.env.PG_DUMP_PATH)) {
      pgDumpBin = `"${process.env.PG_DUMP_PATH}"`;
    } else if (fs.existsSync(winPgDump)) {
      pgDumpBin = `"${winPgDump}"`;
    }

    const pgDumpCmd = `${pgDumpBin} "${cleanDbUrl}" -n public -f "${filePath}"`;

    try {
      if (!cleanDbUrl) {
        throw new Error('DATABASE_URL not set for pg_dump; using logical snapshot');
      }
      await execAsync(pgDumpCmd);
    } catch (pgErr) {
      logger.warn(`pg_dump unavailable or exited early (${pgErr.message}); writing logical PostgreSQL JSON snapshot instead.`);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (_) { /* ignore partial sql */ }
      }
      filePath = path.join(backupDir, `gbs_loan_${timestamp}.json`);
      const [tenants, users, members, loans, payments, systemLock] = await Promise.all([
        prisma.tenant.findMany(),
        prisma.user.findMany({
          select: {
            id: true, tenantId: true, branchId: true, email: true, username: true, phone: true,
            role: true, status: true, firstName: true, lastName: true, gpsAddress: true, createdAt: true,
          },
        }),
        prisma.member.findMany(),
        prisma.loan.findMany(),
        prisma.payment.findMany(),
        prisma.systemLockState.findMany(),
      ]);
      const snapshotPayload = {
        snapshotFormat: 'GBS_POSTGRES_LOGICAL_SNAPSHOT_V1',
        createdAt: new Date().toISOString(),
        recordCounts: {
          tenants: tenants.length,
          users: users.length,
          members: members.length,
          loans: loans.length,
          payments: payments.length,
        },
        data: { tenants, users, members, loans, payments, systemLock },
      };
      fs.writeFileSync(filePath, JSON.stringify(snapshotPayload, null, 2), 'utf8');
    }

    const stats = fs.statSync(filePath);

    await prisma.systemBackup.update({
      where: { id: backup.id },
      data: {
        status: 'SUCCESS',
        filePath,
        fileSize: BigInt(stats.size),
        completedAt: new Date(),
      },
    });

    logger.info(`Backup completed: ${filePath}`);
    await cleanOldBackups();

    return { id: backup.id, filePath, size: stats.size };
  } catch (error) {
    await prisma.systemBackup.update({
      where: { id: backup.id },
      data: { status: 'FAILED', errorMessage: error.message, completedAt: new Date() },
    });
    logger.error('Backup failed:', error);
    throw error;
  }
}

async function cleanOldBackups() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - config.backup.retentionDays);

  const oldBackups = await prisma.systemBackup.findMany({
    where: { createdAt: { lt: cutoff }, status: 'SUCCESS' },
  });

  for (const backup of oldBackups) {
    if (backup.filePath && fs.existsSync(backup.filePath)) {
      fs.unlinkSync(backup.filePath);
    }
    await prisma.systemBackup.delete({ where: { id: backup.id } });
  }
}

module.exports = { runBackup, cleanOldBackups };
