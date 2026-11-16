const feedbackService = require('../services/feedback.service');
const { success, created } = require('../utils/response');

class FeedbackController {
  /**
   * POST /api/v1/feedback
   * Public or Authenticated Submission
   */
  async create(req, res, next) {
    try {
      const isDev = Boolean(req.developer || req.user?.isDeveloper);
      const reqMeta = {
        ipAddress: req.ip || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent'],
        deviceFingerprint: req.headers['x-device-fingerprint'] || req.body?.deviceFingerprint,
        isDeveloper: isDev,
      };

      const result = await feedbackService.submitFeedback(req.body, req.user || req.developer || null, reqMeta);
      return created(res, result, 'Feedback received successfully. Thank you for your submission.');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/feedback
   * List feedbacks (scoped by caller: developer, company owner, or user)
   */
  async getAll(req, res, next) {
    try {
      const isDev = Boolean(req.developer || req.user?.isDeveloper);
      const result = await feedbackService.getFeedbacks(
        req.query,
        req.user || req.developer || null,
        isDev
      );
      return success(res, result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/feedback/:id/respond
   * Respond to feedback
   */
  async respond(req, res, next) {
    try {
      const isDev = Boolean(req.developer || req.user?.isDeveloper);
      const responder = req.developer || req.user || {};
      const updated = await feedbackService.respondToFeedback(
        req.params.id,
        req.body,
        responder,
        isDev
      );
      return success(res, updated, 'Feedback response saved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/feedback/:id
   */
  async remove(req, res, next) {
    try {
      const isDev = Boolean(req.developer || req.user?.isDeveloper);
      const tenantId = req.user?.tenantId || null;
      const result = await feedbackService.deleteFeedback(req.params.id, tenantId, isDev);
      return success(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new FeedbackController();
