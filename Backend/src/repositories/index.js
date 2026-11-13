const memberRepository = require('./member.repository');
const loanRepository = require('./loan.repository');
const paymentRepository = require('./payment.repository');
const staffRepository = require('./staff.repository');
const auditRepository = require('./audit.repository');
const voiceRepository = require('./voice.repository');
const migrationRepository = require('./migration.repository');
const tenantRepository = require('./tenant.repository');
const subscriptionRepository = require('./subscription.repository');
const locationRepository = require('./location.repository');
const analyticsRepository = require('./analytics.repository');
const approvalRepository = require('./approval.repository');
const archiveRepository = require('./archive.repository');
const customerRepository = require('./customer.repository');
const deviceRepository = require('./device.repository');
const permissionRepository = require('./permission.repository');
const reportRepository = require('./report.repository');
const workflowRepository = require('./workflow.repository');

module.exports = {
  memberRepository,
  loanRepository,
  paymentRepository,
  staffRepository,
  auditRepository,
  voiceRepository,
  migrationRepository,
  tenantRepository,
  subscriptionRepository,
  locationRepository,
  analyticsRepository,
  approvalRepository,
  archiveRepository,
  customerRepository,
  deviceRepository,
  permissionRepository,
  reportRepository,
  workflowRepository
};
