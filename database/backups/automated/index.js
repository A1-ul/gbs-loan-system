const policy = require('./backup_policy.json');
const { validateBackupIntegrity } = require('./restore_check');

module.exports = {
  policy,
  validateBackupIntegrity,
  status: 'active',
};
