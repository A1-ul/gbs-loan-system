const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const { prisma } = require('../../../config/database');
const { signDeveloperToken } = require('../../../utils/jwt');
const { AuthenticationError, AuthorizationError } = require('../../../utils/errors');
const logger = require('../../../utils/logger');

/**
 * Isolated Developer Landlord Authentication Service
 * Strictly separate from tenant user authentication (`users` table).
 */
async function developerLogin({ email, password, totpToken, deviceFingerprint }, reqMeta = {}) {
  if (!email || !password) {
    throw new AuthenticationError('Developer email and password are required');
  }

  const devUser = await prisma.developerUser.findUnique({
    where: { email: String(email).toLowerCase().trim() },
  });

  if (!devUser || !devUser.isActive) {
    throw new AuthenticationError('Invalid Developer Authority credentials');
  }

  const validPwd = await bcrypt.compare(password, devUser.passwordHash);
  if (!validPwd) {
    throw new AuthenticationError('Invalid Developer Authority credentials');
  }

  if (devUser.twoFactorSecret) {
    if (!totpToken) {
      throw new AuthenticationError('Developer 2FA TOTP code required');
    }
    const ok = speakeasy.totp.verify({
      secret: devUser.twoFactorSecret,
      encoding: 'base32',
      token: totpToken,
      window: 1,
    });
    if (!ok) {
      throw new AuthenticationError('Invalid Developer 2FA TOTP token');
    }
  }

  const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
  const rawTokenId = crypto.randomBytes(24).toString('hex');

  const session = await prisma.developerSession.create({
    data: {
      developerUserId: devUser.id,
      sessionToken: rawTokenId,
      ipAddress: reqMeta.ipAddress || null,
      userAgent: reqMeta.userAgent || null,
      deviceFingerprint: deviceFingerprint || reqMeta.deviceFingerprint || null,
      expiresAt,
    },
  });

  await prisma.developerUser.update({
    where: { id: devUser.id },
    data: { lastLoginAt: new Date(), lastLoginIp: reqMeta.ipAddress || null },
  });

  await prisma.developerAuditLog.create({
    data: {
      developerUserId: devUser.id,
      action: 'DEVELOPER_LOGIN',
      targetComponent: 'DEVELOPER_PORTAL',
      details: { ipAddress: reqMeta.ipAddress, deviceFingerprint: deviceFingerprint || null },
      ipAddress: reqMeta.ipAddress || null,
    },
  });

  const accessToken = signDeveloperToken({
    developerUserId: devUser.id,
    email: devUser.email,
    accessLevel: devUser.accessLevel,
    sessionId: session.id,
  });

  logger.info(`Developer Authority authenticated: ${devUser.email}`);
  return {
    accessToken,
    expiresAt,
    developer: {
      id: devUser.id,
      username: devUser.username,
      email: devUser.email,
      accessLevel: devUser.accessLevel,
      role: 'DEVELOPER_LANDLORD',
      lastLoginAt: devUser.lastLoginAt,
    },
  };
}

async function developerLogout(developerUserId, ipAddress = null) {
  await prisma.developerSession.deleteMany({ where: { developerUserId } });
  await prisma.developerAuditLog.create({
    data: {
      developerUserId,
      action: 'DEVELOPER_LOGOUT',
      targetComponent: 'DEVELOPER_PORTAL',
      ipAddress,
    },
  }).catch(() => null);
}

async function getDeveloperProfile(developerUserId) {
  const dev = await prisma.developerUser.findUnique({
    where: { id: developerUserId },
    select: {
      id: true,
      username: true,
      email: true,
      accessLevel: true,
      isActive: true,
      lastLoginAt: true,
      lastLoginIp: true,
    },
  });
  if (!dev) throw new AuthorizationError('Developer profile not found');
  return dev;
}

module.exports = {
  developerLogin,
  developerLogout,
  getDeveloperProfile,
};

