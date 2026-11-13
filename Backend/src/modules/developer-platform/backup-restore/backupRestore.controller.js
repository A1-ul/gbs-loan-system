const service = require('./backupRestore.service');

const getBackups = async (req, res, next) => {
  try {
    const data = await service.listBackups();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const createBackup = async (req, res, next) => {
  try {
    const backup = await service.createBackup();
    res.status(201).json({ success: true, data: backup });
  } catch (err) {
    next(err);
  }
};

const restoreBackup = async (req, res, next) => {
  try {
    const result = await service.verifyRestorePoint(req.params.id);
    res.json({ success: true, message: 'Backup restore integrity verified', data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBackups, createBackup, restoreBackup };
