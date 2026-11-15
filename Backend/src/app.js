const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const config = require('./config');
const { getEnvironmentProfile } = require('./config/environments');
const logger = require('./utils/logger');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');
const { metricsMiddleware } = require('./middleware/metrics');
const { auditMiddleware } = require('./middleware/audit');
const { requestIdMiddleware } = require('./middleware/requestId');
const { sanitizeInput } = require('./middleware/sanitize');
const apiGatewayService = require('./services/apiGateway.service');

const app = express();
app.set('trust proxy', 1);

const frontendDistDir = path.resolve(__dirname, '../../Frontend/dist');
const frontendIndexFile = path.join(frontendDistDir, 'index.html');

function resolveCorsOrigin() {
  const raw = config.cors?.origin;
  if (!raw || raw === '*') return '*';
  const entries = String(raw).split(',').map((s) => s.trim()).filter(Boolean);
  const exactAllowed = new Set();
  const wildcardRegexes = [];
  for (const entry of entries) {
    const normalized = entry.replace(/\/$/, '');
    if (normalized.includes('*')) {
      const escaped = normalized.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '[^/]+');
      wildcardRegexes.push(new RegExp(`^${escaped}$`, 'i'));
      continue;
    }
    exactAllowed.add(normalized);
    if (!/^https?:\/\//i.test(normalized)) {
      exactAllowed.add(`https://${normalized}`);
      exactAllowed.add(`http://${normalized}`);
    }
  }
  return (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleaned = origin.replace(/\/$/, '');
    if (exactAllowed.has(cleaned) || wildcardRegexes.some((rx) => rx.test(cleaned))) {
      return callback(null, true);
    }
    return callback(null, false);
  };
}

// 1. API Gateway Request Correlation & Tracking
app.use(requestIdMiddleware);

// 2. Enterprise Security Headers (Helmet)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true,
}));

// 3. Strict Cross-Origin Resource Sharing (CORS)
app.use(cors({
  origin: resolveCorsOrigin(),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-Id',
    'X-Tenant-Id',
    'X-Voice-Biometric',
    'X-Api-Key',
    'X-Device-Fingerprint',
    'X-Environment-Mode',
  ],
  exposedHeaders: ['X-Request-Id', 'X-Response-Time', 'Content-Disposition'],
  credentials: true,
}));

// 4. Performance, Uploads & Request Body Parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(config.upload.path));
if (fs.existsSync(frontendDistDir)) {
  app.use(express.static(frontendDistDir, { index: false, maxAge: '7d' }));
}

// 5. Input Sanitization & Anti-XSS / Prototype Pollution Defense
app.use(sanitizeInput);

// 6. HTTP Request Logging
app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));

// 7. Prometheus Metrics
if (config.metrics?.enabled) {
  app.use(metricsMiddleware);
}

// 8. Global Rate Limiter & Audit Middleware
app.use(rateLimiter);
app.use(auditMiddleware);

// 9. Root & Health Check Endpoints
const apiVersion = config.app?.apiVersion || 'v1';

const sendHealthResponse = (req, res) => {
  const envProfile = getEnvironmentProfile();
  res.json({
    status: 'ok',
    service: 'gbs-loan-api',
    environment: envProfile.nodeEnv,
    environmentTag: envProfile.environmentTag,
    dataMode: envProfile.isProduction ? 'PRODUCTION_LIVE' : 'DEVELOPMENT_DEMO',
    isProduction: envProfile.isProduction,
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
};

app.get(['/health', '/api/health', `/api/${apiVersion}/health`], sendHealthResponse);

// 10. API Gateway Status & Service Catalog
app.get(`/api/${apiVersion}/gateway/status`, (req, res) => {
  res.json({
    success: true,
    data: apiGatewayService.getGatewayStatus(),
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

// 11. Main API Routes
app.use(`/api/${apiVersion}`, routes);

// 11b. Unified Frontend SPA Delivery (for single free cloudhost deployment on Render)
app.get('*', (req, res, next) => {
  if (
    req.path.startsWith('/api')
    || req.path.startsWith('/uploads')
    || req.path.startsWith('/socket.io')
    || req.path === '/health'
    || req.path === '/metrics'
  ) {
    return next();
  }
  if (fs.existsSync(frontendIndexFile)) {
    return res.sendFile(frontendIndexFile);
  }
  return next();
});

// 12. Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
