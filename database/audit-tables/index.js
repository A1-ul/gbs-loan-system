const fs = require('fs');
const path = require('path');

const tables = [
  'audit_logs.table.sql',
  'security_audit.table.sql',
  'transaction_audit.table.sql',
  'user_audit.table.sql',
  'login_audit.table.sql',
  'system_event_audit.table.sql',
];

function getAuditTableSchemas() {
  return tables.map((filename) => ({
    name: filename.replace('.table.sql', ''),
    filename,
    sql: fs.readFileSync(path.join(__dirname, filename), 'utf8'),
  }));
}

module.exports = {
  tables,
  getAuditTableSchemas,
};
