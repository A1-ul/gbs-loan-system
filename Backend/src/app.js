const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const config = require('./config');
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

function resolveCorsOrigin() {
  const raw = config.cors?.origin;
  if (!raw || raw === '*') return '*';
  const entries = String(raw).split(',').map((s) => s.trim()).filter(Boolean);
  const allowed = new Set();
  for (const entry of entries) {
    allowed.add(entry.replace(/\/$/, ''));
    if (!/^https?:\/\//i.test(entry)) {
      allowed.add(`https://${entry.replace(/\/$/, '')}`);
      allowed.add(`http://${entry.replace(/\/$/, '')}`);
    }
  }
  return (origin, callback) => {
    if (!origin || allowed.has(origin.replace(/\/$/, ''))) {
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
  ],
  exposedHeaders: ['X-Request-Id', 'X-Response-Time', 'Content-Disposition'],
  credentials: true,
}));

// 4. Performance, Uploads & Request Body Parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(config.upload.path));

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

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'gbs-loan-api',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'gbs-loan-api',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

app.get(`/api/${apiVersion}/health`, (req, res) => {
  res.json({
    status: 'ok',
    service: 'gbs-loan-api',
    requestId: req.id,
    timestamp: new Date().toISOString(),
  });
});

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

// 12. Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
