const workflowRepository = require('../repositories/workflow.repository');

class WorkflowService {
  async getLoanAuditLogs(loanId) {
    return workflowRepository.getLoanWorkflowHistory(loanId);
  }
}

module.exports = new WorkflowService();
