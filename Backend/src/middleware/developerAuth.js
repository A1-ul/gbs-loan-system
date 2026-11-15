const { prisma } = require('../config/database');
const { verifyDeveloperToken } = require('../utils/jwt');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');

/**
 * Isolated Developer Landlord Authentication Middleware
 * Completely separated from tenant JWTs, COMPANY_OWNER, and MANAGER roles.
 */
async function authenticateDeveloper(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return next(new AuthenticationError('Developer Authority token required'));
    }

    let decoded;
    try {
      decoded = verifyDeveloperToken(token);
    } catch (err) {
      return next(new AuthenticationError('Invalid or expired Developer Authority credentials'));
    }

    const devUser = await prisma.developerUser.findUnique({
      where: { id: decoded.developerUserId },
      select: {
        id: true,
        username: true,
        email: true,
        accessLevel: true,
        isActive: true,
        allowedIps: true,
        twoFactorSecret: true,
      },
    });

    if (!devUser || !devUser.isActive) {
      return next(new AuthorizationError('Developer Authority account disabled or not found'));
    }

    // Verify active persisted DeveloperSession
    if (decoded.sessionId) {
      const session = await prisma.developerSession.findUnique({
        where: { id: decoded.sessionId },
      });
      if (!session || session.expiresAt < new Date()) {
        return next(new AuthenticationError('Developer session has expired or was revoked'));
      }
    }

    req.developer = devUser;
    // Populate minimal req.user id for downstream audit logger compatibility without granting tenant access
    req.user = {
      id: devUser.id,
      email: devUser.email,
      role: 'DEVELOPER_LANDLORD',
      isDeveloper: true,
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { authenticateDeveloper };

