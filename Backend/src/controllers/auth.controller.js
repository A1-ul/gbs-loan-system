const authService = require('../services/auth.service');
const { success, created } = require('../utils/response');

function extractReqMeta(req) {
  return {
    ipAddress: req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null,
    deviceFingerprint: req.body?.deviceFingerprint || req.headers['x-device-fingerprint'] || null,
  };
}

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body, extractReqMeta(req));
    return created(res, result, 'Registration successful. Please complete OTP verification.');
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body, extractReqMeta(req));
    return success(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const profile = await authService.getProfile(req.user.id);
    return success(res, profile, 'Session active');
  } catch (err) {
    next(err);
  }
}

async function verifyOtp(req, res, next) {
  try {
    const result = await authService.verifyOtp(req.body);
    return success(res, result, result.message || 'OTP verified successfully');
  } catch (err) {
    next(err);
  }
}

async function resendOtp(req, res, next) {
  try {
    const result = await authService.resendOtp(req.body);
    return success(res, result, 'Verification OTP resent successfully');
  } catch (err) {
    next(err);
  }
}

async function refreshToken(req, res, next) {
  try {
    const result = await authService.refreshToken(req.body.refreshToken);
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.user.id, req.body.refreshToken);
    return success(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

async function setup2FA(req, res, next) {
  try {
    const result = await authService.setup2FA(req.user.id);
    return success(res, result);
  } catch (err) {
    next(err);
  }
}

async function enable2FA(req, res, next) {
  try {
    await authService.enable2FA(req.user.id, req.body.totpToken);
    return success(res, null, '2FA enabled successfully');
  } catch (err) {
    next(err);
  }
}

async function disable2FA(req, res, next) {
  try {
    await authService.disable2FA(req.user.id);
    return success(res, null, '2FA disabled successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  me,
  verifyOtp,
  resendOtp,
  refreshToken,
  logout,
  setup2FA,
  enable2FA,
  disable2FA,
};
