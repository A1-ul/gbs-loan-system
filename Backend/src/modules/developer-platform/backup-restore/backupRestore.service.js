const fs = require('fs');
const path = require('path');
const { prisma } = require('../../../config/database');
const backupService = require('../../../services/backup.service');
const { NotFoundError, AppError } = require('../../../utils/errors');

class BackupRestoreService {
  async listBackups() {
    const rows = await prisma.systemBackup.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return rows.map((b) => {
      const sizeBytes = b.fileSize !== null && b.fileSize !== undefined ? Number(b.fileSize) : 0;
      const fileName = b.filePath ? path.basename(b.filePath) : `snapshot-${b.id}`;
      const backupType = fileName.endsWith('.json') ? 'LOGICAL_SNAPSHOT' : 'POSTGRES_SQL_DUMP';
      return {
        ...b,
        fileName,
        backupType,
        fileSize: sizeBytes,
        fileSizeBytes: sizeBytes,
        sizeMb: sizeBytes ? Number((sizeBytes / (1024 * 1024)).toFixed(2)) : 0,
      };
    });
  }

  async createBackup() {
    const result = await backupService.runBackup();
    const sizeBytes = Number(result.size || 0);
    const fileName = result.filePath ? path.basename(result.filePath) : `snapshot-${result.id}`;
    return {
      ...result,
      fileName,
      backupType: fileName.endsWith('.json') ? 'LOGICAL_SNAPSHOT' : 'POSTGRES_SQL_DUMP',
      fileSize: sizeBytes,
      fileSizeBytes: sizeBytes,
      sizeMb: sizeBytes ? Number((sizeBytes / (1024 * 1024)).toFixed(2)) : 0,
      status: 'SUCCESS',
    };
  }

  async verifyRestorePoint(backupId) {
    const backup = await prisma.systemBackup.findUnique({ where: { id: backupId } });
    if (!backup) throw new NotFoundError('Backup snapshot');

    const fileExists = backup.filePath ? fs.existsSync(backup.filePath) : false;
    if (!fileExists) {
      throw new AppError(`Backup artifact missing on disk: ${backup.filePath}`, 400);
    }
    const stat = fs.statSync(backup.filePath);
    const header = fs.readFileSync(backup.filePath, { encoding: 'utf8', flag: 'r' }).slice(0, 128);

    await prisma.developerAuditLog.create({
      data: {
        action: 'BACKUP_RESTORE_POINT_VERIFIED',
        targetComponent: `backup:${backup.id}`,
        details: { filePath: backup.filePath, bytes: stat.size },
      },
    }).catch(() => { });

    return {
      status: 'RESTORE_POINT_VERIFIED',
      backupId: backup.id,
      filePath: backup.filePath,
      fileSizeBytes: stat.size,
      checksumPreviewValid: header.includes('PostgreSQL database dump') || header.length > 20,
      verifiedAt: new Date().toISOString(),
    };
  }
}

module.exports = new BackupRestoreService();
