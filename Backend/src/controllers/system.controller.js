const systemService = require('../services/system.service');
const { success, created } = require('../utils/response');

async function getStatus(req, res, next) {
  try {
    const status = await systemService.getSystemStatus();
    return success(res, status);
  } catch (err) {
    next(err);
  }
}

async function getHealth(req, res, next) {
  try {
    const health = await systemService.getHealthCheck();
    return success(res, health);
  } catch (err) {
    next(err);
  }
}

async function triggerBackup(req, res, next) {
  try {
    const backup = await systemService.triggerBackup();
    return created(res, backup, 'Backup initiated');
  } catch (err) {
    next(err);
  }
}

async function getBackupHistory(req, res, next) {
  try {
    const backups = await systemService.getBackupHistory();
    return success(res, backups);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStatus,
  getHealth,
  triggerBackup,
  getBackupHistory,
};
