const rateLimit = require('express-rate-limit');
const config = require('../config');

// Global general API rate limiter
const rateLimiter = rateLimit({
  windowMs: config.rateLimit?.windowMs || 15 * 60 * 1000,
  max: config.rateLimit?.maxRequests || 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this client, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

// Strict authentication rate limiter (prevent brute-force logins & credential stuffing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes',
    code: 'AUTH_RATE_LIMIT',
  },
});

// Financial transactions rate limiter (protect loan applications, approvals, disbursements, and payments)
const transactionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Financial transaction rate limit exceeded. Please wait a moment before resubmitting',
    code: 'TRANSACTION_RATE_LIMIT',
  },
});

// Sensitive operations limiter (system lockdown, developer mutations, database snapshots)
const sensitiveOpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Sensitive operation rate limit exceeded. Please slow down',
    code: 'SENSITIVE_OP_RATE_LIMIT',
  },
});

module.exports = {
  rateLimiter,
  authLimiter,
  transactionLimiter,
  sensitiveOpLimiter,
};
