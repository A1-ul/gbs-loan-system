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

    const filePath = path.join(backupDir, `gbs_loan_${timestamp}.sql`);
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

    await execAsync(pgDumpCmd);

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
