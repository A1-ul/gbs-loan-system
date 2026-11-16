const express = require('express');
const feedbackController = require('../controllers/feedback.controller');
const { verifyAccessToken, verifyDeveloperToken } = require('../utils/jwt');
const { prisma } = require('../config/database');
const { rateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * Flexible middleware that identifies either a standard Tenant User or Developer Authority
 */
async function attachCallerIfPresent(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) return next();

  // 1. Try developer authority token
  try {
    const devDecoded = verifyDeveloperToken(token);
    if (devDecoded?.developerUserId) {
      const dev = await prisma.developerUser.findUnique({
        where: { id: devDecoded.developerUserId },
      });
      if (dev && dev.isActive) {
        req.developer = dev;
        req.user = { id: dev.id, email: dev.email, role: 'DEVELOPER_LANDLORD', isDeveloper: true };
        return next();
      }
    }
  } catch {}

  // 2. Try standard user JWT
  try {
    const userDecoded = verifyAccessToken(token);
    if (userDecoded?.userId) {
      const user = await prisma.user.findUnique({
        where: { id: userDecoded.userId },
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          firstName: true,
          lastName: true,
          tenantId: true,
          branchId: true,
          status: true,
        },
      });
      if (user) {
        req.user = user;
        req.tenantId = user.tenantId;
        return next();
      }
    }
  } catch {}

  return next();
}

function requireAnyAuth(req, res, next) {
  if (req.user || req.developer) return next();
  return res.status(401).json({
    success: false,
    message: 'Authentication required to inspect or manage feedbacks.',
    code: 'AUTHENTICATION_ERROR',
  });
}

function requireManagementOrDev(req, res, next) {
  if (req.developer || req.user?.isDeveloper) return next();
  const role = String(req.user?.role || '').toUpperCase();
  if (['COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT', 'BOARD_EXECUTIVE', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'MANAGER'].includes(role)) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Only Company Owner, Branch Managers, or Developer Authority can respond to feedbacks.',
    code: 'AUTHORIZATION_ERROR',
  });
}

// 1. Submit Feedback (Open to everyone, including guests, logged-in users, & developer)
router.post('/', attachCallerIfPresent, rateLimiter, feedbackController.create);

// 2. List Feedbacks
router.get('/', attachCallerIfPresent, requireAnyAuth, feedbackController.getAll);

// 3. Respond to Feedback
router.post('/:id/respond', attachCallerIfPresent, requireManagementOrDev, feedbackController.respond);
router.put('/:id', attachCallerIfPresent, requireManagementOrDev, feedbackController.respond);

// 4. Delete Feedback
router.delete('/:id', attachCallerIfPresent, requireManagementOrDev, feedbackController.remove);

module.exports = router;
