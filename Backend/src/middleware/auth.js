const { prisma } = require('../config/database');
const { verifyAccessToken } = require('../utils/jwt');
const { AuthenticationError, AppError } = require('../utils/errors');

const SAFE_LOCKED_PATHS = [
  '/auth/logout',
  '/tenants/my-status',
  '/tenants/my/countdown',
  '/tenants/my/subscription',
  '/tenants/subscription-plans',
  '/notifications',
];

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return next(new AuthenticationError('Access token required'));
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (jwtErr) {
      return next(new AuthenticationError('Invalid or expired access token'));
    }

    if (!decoded || !decoded.userId) {
      return next(new AuthenticationError('Malformed authentication token'));
    }

    // Check global platform lock state first
    const lockState = await prisma.systemLockState.findFirst();
    if (lockState && (lockState.isLocked || lockState.maintenanceMode)) {
      return res.status(503).json({
        success: false,
        code: 'SYSTEM_LOCKED',
        message: lockState.lockReason || 'GBS Loan System is currently locked for maintenance by Developer Authority.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        tenantId: true,
        branchId: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        facialEnrolled: true,
        qualificationVerified: true,
        deletedAt: true,
        tenant: {
          select: {
            id: true,
            code: true,
            name: true,
            logoUrl: true,
            companyNameUpdated: true,
            status: true,
            onboardingStatus: true,
            subscriptionPlan: true,
            subscriptionMonths: true,
            isLifetime: true,
            subExpiry: true,
            daysLeft: true,
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      return next(new AuthenticationError('User account not found or deleted'));
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_NOT_ACTIVE',
        message: `Account status is '${user.status}'. Verification or administrator approval is required.`,
      });
    }

    // Enforce Tenant Onboarding Approval & 90-day Subscription Countdown Lock
    const isSafeRoute = SAFE_LOCKED_PATHS.some((p) => req.originalUrl.includes(p));
    if (user.tenant && !isSafeRoute) {
      if (['PENDING', 'VERIFICATION_REQUIRED', 'REJECTED'].includes(user.tenant.onboardingStatus)) {
        return res.status(403).json({
          success: false,
          code: 'TENANT_PENDING_APPROVAL',
          message: `Organization '${user.tenant.name}' is awaiting Developer approval (${user.tenant.onboardingStatus}).`,
        });
      }

      const now = Date.now();
      const isLifetime = Boolean(user.tenant.isLifetime);
      const expiryMs = user.tenant.subExpiry ? new Date(user.tenant.subExpiry).getTime() : null;
      const isExpired = !isLifetime && expiryMs !== null && expiryMs <= now;
      if (
        isExpired ||
        ['LOCKED_EXPIRED', 'SUSPENDED', 'REJECTED'].includes(user.tenant.status) ||
        ['TRIAL_EXPIRED', 'LOCKED', 'SUSPENDED', 'CANCELLED'].includes(user.tenant.onboardingStatus)
      ) {
        if (isExpired && user.tenant.status !== 'LOCKED_EXPIRED') {
          await prisma.tenant.update({
            where: { id: user.tenant.id },
            data: { status: 'LOCKED_EXPIRED', onboardingStatus: 'TRIAL_EXPIRED', daysLeft: 0 },
          }).catch(() => {});
        }
        return res.status(402).json({
          success: false,
          code: 'TENANT_SUBSCRIPTION_EXPIRED',
          message: `Access locked for '${user.tenant.name}'. Subscription cycle expired or suspended. Contact Developer Authority to renew.`,
          data: {
            tenantId: user.tenant.id,
            tenantCode: user.tenant.code,
            status: 'LOCKED_EXPIRED',
            daysLeft: 0,
          },
        });
      }
    }

    req.user = user;
    req.tenantId = user.tenantId || null;
    req.branchId = user.branchId || null;
    req.tenant = user.tenant || null;
    return next();
  } catch (err) {
    return next(err instanceof AppError ? err : new AuthenticationError(err.message));
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next();
  return authenticate(req, res, next);
}

module.exports = { authenticate, authenticateJwt: authenticate, optionalAuth };
