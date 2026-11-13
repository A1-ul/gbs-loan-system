const approvalRepository = require('../repositories/approval.repository');

class ApprovalController {
  async getPendingApprovals(req, res, next) {
    try {
      const approvals = await approvalRepository.getPendingApprovals();
      res.json({ success: true, count: approvals.length, data: approvals });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ApprovalController();
