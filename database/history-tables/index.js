const fs = require('fs');
const path = require('path');

const tables = [
  'loan_history.sql',
  'member_history.sql',
  'payment_history.sql',
  'repayment_history.sql',
  'salary_history.sql',
  'staff_history.sql',
  'guarantor_history.sql',
];

function getHistoryTableSchemas() {
  return tables.map((filename) => ({
    name: filename.replace('.sql', ''),
    filename,
    sql: fs.readFileSync(path.join(__dirname, filename), 'utf8'),
  }));
}

module.exports = {
  tables,
  getHistoryTableSchemas,
};
