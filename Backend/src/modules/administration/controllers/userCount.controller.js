/**
 * GBS LOAN MANAGEMENT SYSTEM - USER REGISTRATION COUNT & VERIFICATION CONTROLLER
 * Standard: Node.js CommonJS
 */

const userCountService = require('../services/userCount.service');
const { success } = require('../../../utils/response');

class UserCountController {
  /**
   * GET /api/v1/users/counts-by-role
   * Returns exact system-generated counts for all 30 roles
   */
  async getCountsByRole(req, res, next) {
    try {
      const tenantId = req.tenantId || req.user?.tenantId;
      const data = await userCountService.getCountsByRole({ tenantId });
      return success(res, data, 'System-generated user counts by role retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/users/by-role/:role
   * Returns actual user records stored in database for that role (Admin cross-check)
   */
  async getUsersByRole(req, res, next) {
    try {
      const { role } = req.params;
      const { status, search, page, limit } = req.query;
      const tenantId = req.tenantId || req.user?.tenantId;
      const data = await userCountService.getUsersByRole(role, { status, search, page, limit, tenantId });
      return success(res, data, `Registered users for role ${role} retrieved successfully`);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/users/:id/verify-qualification
   * Admin verifies if user is qualified through registration details
   */
  async verifyQualification(req, res, next) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const tenantId = req.tenantId || req.user?.tenantId;
      const { isQualified, notes } = req.body;
      const ipAddress = req.ip || req.connection?.remoteAddress;

      const data = await userCountService.verifyQualification(id, adminId, {
        isQualified,
        notes,
        ipAddress,
        tenantId,
      });
      return success(res, data, data.message);
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/v1/users/:id/remove-unqualified
   * Admin deletes an unqualified account after reviewing profile
   */
  async removeUnqualifiedUser(req, res, next) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const tenantId = req.tenantId || req.user?.tenantId;
      const { reason } = req.body;
      const ipAddress = req.ip || req.connection?.remoteAddress;

      const data = await userCountService.removeUnqualifiedUser(id, adminId, {
        reason,
        ipAddress,
        tenantId,
      });
      return success(res, data, data.message);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/users/registration-alerts
   * Admin registration alerts and recent qualification changes
   */
  async getRegistrationAlerts(req, res, next) {
    try {
      const { limit } = req.query;
      const tenantId = req.tenantId || req.user?.tenantId;
      const data = await userCountService.getRegistrationAlerts(limit, tenantId);
      return success(res, data, 'Registration alerts retrieved successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserCountController();
