const fs = require('fs');
const path = require('path');

function validateBackupIntegrity(backupFilePath) {
  if (!backupFilePath || !fs.existsSync(backupFilePath)) {
    return { valid: false, error: 'Backup file does not exist' };
  }
  const stats = fs.statSync(backupFilePath);
  return {
    valid: stats.size > 0,
    sizeBytes: stats.size,
    checkedAt: new Date().toISOString(),
  };
}

module.exports = {
  validateBackupIntegrity,
};
