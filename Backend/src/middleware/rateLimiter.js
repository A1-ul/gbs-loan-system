const rateLimit = require('express-rate-limit');
const config = require('../config');

// Global general API rate limiter — skips health, preflight, and non-API SPA assets
const rateLimiter = rateLimit({
  windowMs: config.rateLimit?.windowMs || 15 * 60 * 1000,
  max: Math.max(Number(config.rateLimit?.maxRequests || 0), 5000),
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  skip: (req) =>
    req.method === 'OPTIONS' ||
    !String(req.originalUrl || '').startsWith('/api') ||
    String(req.originalUrl || '').includes('/health'),
  keyGenerator: (req) => {
    const auth = req.headers?.authorization || '';
    const tokenSuffix = auth.length > 24 ? auth.slice(-18) : '';
    const ip = req.ip || req.headers?.['x-forwarded-for'] || 'local';
    return tokenSuffix ? `${ip}:${tokenSuffix}` : String(ip);
  },
  message: {
    success: false,
    message: 'Too many requests from this client, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

// Authentication rate limiter — only counts FAILED attempts so valid sessions never lock out users
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    success: false,
    message: 'Too many failed authentication attempts. Please try again after 15 minutes',
    code: 'AUTH_RATE_LIMIT',
  },
});

// Generous walkthrough limiter so demo explorers can switch across all 30 role dashboards freely
const demoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    success: false,
    message: 'Demo session rate limit reached. Please wait a moment and try again.',
    code: 'DEMO_RATE_LIMIT',
  },
});

// Financial transactions rate limiter (protect loan applications, approvals, disbursements, and payments)
const transactionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    success: false,
    message: 'Financial transaction rate limit exceeded. Please wait a moment before resubmitting',
    code: 'TRANSACTION_RATE_LIMIT',
  },
});

// Sensitive operations limiter (system lockdown, developer mutations, database snapshots)
const sensitiveOpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    success: false,
    message: 'Sensitive operation rate limit exceeded. Please slow down',
    code: 'SENSITIVE_OP_RATE_LIMIT',
  },
});

module.exports = {
  rateLimiter,
  authLimiter,
  demoLimiter,
  transactionLimiter,
  sensitiveOpLimiter,
};
