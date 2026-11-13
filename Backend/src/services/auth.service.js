const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { prisma } = require('../config/database');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { generateOtp } = require('../utils/encryption');
const { AuthenticationError, AuthorizationError, ConflictError, NotFoundError } = require('../utils/errors');
const { getEnvironmentProfile, getRecordProvenance } = require('../config/environments');
const notificationService = require('./notification.service');

const PRIVILEGED_SELF_REG_BLOCKLIST = new Set([
  'DEVELOPER',
  'DEVELOPER_LANDLORD',
  'SUPER_ADMIN',
  'COMPANY_OWNER',
  'BOARD_EXECUTIVE',
  'EXECUTIVE_MANAGEMENT',
]);

async function register(data, reqMeta = {}) {
  const envProfile = getEnvironmentProfile();
  let formattedPhone = String(data.phone || '').trim();
  if (formattedPhone.startsWith('0') && formattedPhone.length === 10) {
    formattedPhone = '+233' + formattedPhone.slice(1);
  }

  const normalizedRole = data.role ? String(data.role).toUpperCase().replace(/-/g, '_') : 'MEMBER_PORTAL';
  if (PRIVILEGED_SELF_REG_BLOCKLIST.has(normalizedRole)) {
    throw new AuthorizationError(`Self-registration as '${normalizedRole}' is prohibited. Use institutional onboarding or Administrator provisioning.`);
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: data.email.toLowerCase().trim() }, { phone: formattedPhone }, { phone: data.phone }] },
  });
  if (existing) throw new ConflictError('Email or phone already registered');

  // Bind to approved tenant if tenantId/tenantCode supplied
  let resolvedTenantId = null;
  if (data.tenantId || data.tenantCode) {
    const t = await prisma.tenant.findFirst({
      where: { OR: [{ id: data.tenantId || '' }, { code: data.tenantCode || '' }] },
    });
    if (!t) throw new NotFoundError('Target tenant organization');
    if (['PENDING', 'VERIFICATION_REQUIRED', 'REJECTED'].includes(t.onboardingStatus)) {
      throw new AuthorizationError(`Organization '${t.name}' must be approved by Developer Authority before users or staff can register.`);
    }
    resolvedTenantId = t.id;
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const otp = generateOtp(6);
  const provenance = getRecordProvenance();

  const isStaffRegistration = !['MEMBER', 'MEMBER_PORTAL', 'GUARANTOR', 'GUARANTOR_PORTAL'].includes(normalizedRole);

  const user = await prisma.user.create({
    data: {
      tenantId: resolvedTenantId,
      email: data.email.toLowerCase().trim(),
      username: data.email.toLowerCase().trim().split('@')[0],
      phone: formattedPhone,
      passwordHash,
      role: normalizedRole,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      address: data.address ? String(data.address).trim() : null,
      gpsAddress: data.gpsAddress ? String(data.gpsAddress).trim().toUpperCase() : null,
      gpsLatitude: data.gpsLatitude != null ? Number(data.gpsLatitude) : null,
      gpsLongitude: data.gpsLongitude != null ? Number(data.gpsLongitude) : null,
      otpCode: otp,
      otpExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      status: 'PENDING_VERIFICATION',
      qualificationVerified: !isStaffRegistration,
      lastDeviceFingerprint: reqMeta.deviceFingerprint || null,
      ...provenance,
    },
    select: {
      id: true, email: true, phone: true, role: true, status: true,
      firstName: true, lastName: true, tenantId: true, gpsAddress: true,
    },
  });

  const otpNotification = await notificationService.queue({
    immediate: true,
    tenantId: resolvedTenantId,
    userId: user.id,
    type: 'SMS',
    category: 'OTP_VERIFICATION',
    title: 'Verify Your GBS Loan Account',
    message: `Your GBS Loan verification code is: ${otp}`,
    recipient: user.phone,
  }).catch(() => null);

  await prisma.auditLog.create({
    data: {
      tenantId: resolvedTenantId,
      userId: user.id,
      action: 'USER_REGISTERED',
      entityType: 'user',
      entityId: user.id,
      ipAddress: reqMeta.ipAddress || null,
      userAgent: reqMeta.userAgent || null,
      metadata: {
        email: user.email,
        phone: user.phone,
        role: user.role,
        gpsAddress: user.gpsAddress,
        fullName: `${user.firstName} ${user.lastName}`,
        requiresAdminQualificationCheck: isStaffRegistration,
      },
      ...provenance,
    },
  }).catch(() => null);

  return {
    ...user,
    requiresAdminApproval: isStaffRegistration,
    otpDelivery: otpNotification?.deliveryResult || { delivered: false, provider: 'NONE_CONFIGURED' },
    ...(envProfile.isProduction ? {} : { otpCode: otp }),
  };
}

async function login({ email, password, totpToken, deviceFingerprint }, reqMeta = {}) {
  if (!email || !password) {
    throw new AuthenticationError('Email and password are required');
  }

  const user = await prisma.user.findUnique({
    where: { email: String(email).toLowerCase().trim() },
    include: {
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
          subStart: true,
          subExpiry: true,
          daysLeft: true,
        },
      },
      voiceProfile: {
        select: { id: true, isEnrolled: true, passphraseText: true },
      },
    },
  });

  if (!user || user.deletedAt) {
    throw new AuthenticationError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AuthenticationError('Invalid email or password');
  }

  if (user.status === 'PENDING_VERIFICATION' || user.status === 'AWAITING_APPROVAL') {
    throw new AuthorizationError(`Account is ${user.status}. Complete OTP/Administrator qualification approval before signing in.`);
  }

  if (user.status !== 'ACTIVE') {
    throw new AuthorizationError(`Account access blocked (status: ${user.status}). Contact your administrator.`);
  }

  // Enforce Tenant Onboarding Approval & Countdown Lock at Login
  if (user.tenant) {
    if (['PENDING', 'VERIFICATION_REQUIRED', 'REJECTED'].includes(user.tenant.onboardingStatus)) {
      throw new AuthorizationError(
        `Institution '${user.tenant.name}' is awaiting Developer Authority approval (${user.tenant.onboardingStatus}).`
      );
    }

    const now = Date.now();
    const isLifetime = Boolean(user.tenant.isLifetime);
    const expiryMs = user.tenant.subExpiry ? new Date(user.tenant.subExpiry).getTime() : null;
    if ((!isLifetime && expiryMs && expiryMs <= now) || ['LOCKED_EXPIRED', 'SUSPENDED'].includes(user.tenant.status)) {
      throw new AuthorizationError(
        `Organization '${user.tenant.name}' subscription expired or locked. Please contact GBS Developer Authority or renew your subscription plan.`
      );
    }
  }

  // Enforce TOTP if enabled
  if (user.twoFactorEnabled) {
    if (!totpToken) {
      throw new AuthenticationError('Two-Factor Authentication code is required');
    }
    const verified2fa = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: totpToken,
      window: 1,
    });
    if (!verified2fa) {
      throw new AuthenticationError('Invalid Two-Factor Authentication code');
    }
  }

  const payload = { userId: user.id, role: user.role, tenantId: user.tenantId || null };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      deviceFingerprint: deviceFingerprint || reqMeta.deviceFingerprint || null,
      ipAddress: reqMeta.ipAddress || null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      lastLoginIp: reqMeta.ipAddress || null,
      lastDeviceFingerprint: deviceFingerprint || reqMeta.deviceFingerprint || user.lastDeviceFingerprint,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId || null,
      userId: user.id,
      action: 'LOGIN',
      entityType: 'user',
      entityId: user.id,
      ipAddress: reqMeta.ipAddress || null,
      userAgent: reqMeta.userAgent || null,
      metadata: { role: user.role, deviceFingerprint: deviceFingerprint || null },
      ...getRecordProvenance(),
    },
  }).catch(() => null);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      tenantId: user.tenantId,
      branchId: user.branchId,
      email: user.email,
      role: user.role,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      gpsAddress: user.gpsAddress || null,
      profilePicture: user.profilePicture,
      twoFactorEnabled: user.twoFactorEnabled,
      facialEnrolled: user.facialEnrolled,
      qualificationVerified: user.qualificationVerified,
      voiceEnrolled: Boolean(user.voiceProfile?.isEnrolled),
      tenantCode: user.tenant?.code || null,
      tenantName: user.tenant?.name || null,
      tenantLogoUrl: user.tenant?.logoUrl || null,
      isDemo: user.tenant?.code === 'DEMO-SANDBOX',
      environmentMode: user.tenant?.code === 'DEMO-SANDBOX' ? 'DEMO_SANDBOX' : 'PRODUCTION_LIVE',
      tenant: user.tenant,
    },
  };
}

async function verifyOtp({ phone, otp }) {
  const normalizedPhone = String(phone || '').trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: normalizedPhone },
        { phone: normalizedPhone.startsWith('+233') ? '0' + normalizedPhone.slice(4) : normalizedPhone },
        { phone: normalizedPhone.startsWith('0') ? '+233' + normalizedPhone.slice(1) : normalizedPhone },
      ],
    },
  });

  if (!user) throw new NotFoundError('User with this mobile number');

  if (!user.otpCode || user.otpCode !== String(otp).trim()) {
    throw new AuthenticationError('Invalid OTP verification code');
  }
  if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
    throw new AuthenticationError('OTP code has expired. Please request a new code.');
  }

  const isStaffRole = !['MEMBER', 'MEMBER_PORTAL', 'GUARANTOR', 'GUARANTOR_PORTAL'].includes(user.role);
  const nextStatus = isStaffRole && !user.qualificationVerified ? 'AWAITING_APPROVAL' : 'ACTIVE';

  await prisma.user.update({
    where: { id: user.id },
    data: {
      otpVerified: true,
      isPhoneVerified: true,
      otpCode: null,
      otpExpiresAt: null,
      status: nextStatus,
    },
  });

  if (nextStatus !== 'ACTIVE') {
    return {
      verified: true,
      awaitingAdminApproval: true,
      message: 'Mobile OTP verified. Your staff account is awaiting Administrator Qualification Approval.',
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: nextStatus,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  const payload = { userId: user.id, role: user.role, tenantId: user.tenantId || null };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });

  return {
    verified: true,
    awaitingAdminApproval: false,
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: nextStatus,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  };
}

async function resendOtp({ phone }) {
  const envProfile = getEnvironmentProfile();
  const normalizedPhone = String(phone || '').trim();
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: normalizedPhone },
        { phone: normalizedPhone.startsWith('+233') ? '0' + normalizedPhone.slice(4) : normalizedPhone },
        { phone: normalizedPhone.startsWith('0') ? '+233' + normalizedPhone.slice(1) : normalizedPhone },
      ],
    },
  });

  if (!user) throw new NotFoundError('User with this mobile number');

  const otp = generateOtp(6);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      otpCode: otp,
      otpExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  const otpNotification = await notificationService.queue({
    immediate: true,
    tenantId: user.tenantId || null,
    userId: user.id,
    type: 'SMS',
    category: 'OTP_VERIFICATION',
    title: 'Verify Your Account',
    message: `Your new GBS Loan verification code is: ${otp}`,
    recipient: user.phone,
  }).catch(() => null);

  return {
    success: true,
    message: otpNotification?.deliveryResult?.delivered
      ? 'OTP verification code sent via SMS'
      : 'OTP verification code generated (check SMS gateway configuration if live carrier SMS did not arrive)',
    otpDelivery: otpNotification?.deliveryResult || { delivered: false, provider: 'NONE_CONFIGURED' },
    ...(envProfile.isProduction ? {} : { otpCode: otp }),
  };
}

async function refreshToken(token) {
  const decoded = verifyRefreshToken(token);
  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new AuthenticationError('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
  if (!user || user.status !== 'ACTIVE') {
    throw new AuthenticationError('User account is not active');
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role, tenantId: user.tenantId || null });
  return { accessToken };
}

async function logout(userId, refreshTok) {
  if (refreshTok) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshTok, userId } });
  } else {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'LOGOUT',
      entityType: 'user',
      entityId: userId,
      ...getRecordProvenance(),
    },
  }).catch(() => null);
}

async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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
      gpsAddress: true,
      gpsLatitude: true,
      gpsLongitude: true,
      profilePicture: true,
      twoFactorEnabled: true,
      facialEnrolled: true,
      qualificationVerified: true,
      lastLoginAt: true,
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
          subStart: true,
          subExpiry: true,
          daysLeft: true,
        },
      },
      voiceProfile: {
        select: { isEnrolled: true, passphraseText: true, enrolledAt: true },
      },
    },
  });
  if (!user) throw new NotFoundError('User profile');
  return {
    ...user,
    tenantCode: user.tenant?.code || null,
    tenantName: user.tenant?.name || null,
    tenantLogoUrl: user.tenant?.logoUrl || null,
    isDemo: user.tenant?.code === 'DEMO-SANDBOX',
    environmentMode: user.tenant?.code === 'DEMO-SANDBOX' ? 'DEMO_SANDBOX' : 'PRODUCTION_LIVE',
  };
}

async function setup2FA(userId) {
  const secret = speakeasy.generateSecret({ name: 'GBS Loan System', length: 32 });
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret.base32 },
  });

  return { secret: secret.base32, qrCode };
}

async function enable2FA(userId, totpToken) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: totpToken,
    window: 1,
  });
  if (!verified) throw new AuthenticationError('Invalid 2FA token');

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });
}

async function disable2FA(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });
}

module.exports = {
  register,
  login,
  verifyOtp,
  resendOtp,
  refreshToken,
  logout,
  getProfile,
  setup2FA,
  enable2FA,
  disable2FA,
};
