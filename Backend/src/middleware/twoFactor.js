const speakeasy = require('speakeasy');
const { AuthenticationError } = require('../utils/errors');
const config = require('../config');

function require2FA(req, res, next) {
  if (!req.user) {
    return next(new AuthenticationError());
  }

  if (req.user.role !== 'MANAGER' || !req.user.twoFactorEnabled) {
    return next();
  }

  const totpToken = req.headers['x-2fa-token'];
  if (!totpToken) {
    return next(new AuthenticationError('2FA token required for manager actions'));
  }

  const user = req.user;
  if (!user.twoFactorSecret) {
    return next(new AuthenticationError('2FA not configured'));
  }

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: totpToken,
    window: config.totp.window,
  });

  if (!verified) {
    return next(new AuthenticationError('Invalid 2FA token'));
  }

  next();
}

module.exports = { require2FA };
