const client = require('prom-client');
const http = require('http');
const config = require('./index');
const logger = require('../utils/logger');

const register = new client.Registry();

client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const activeLoansGauge = new client.Gauge({
  name: 'gbs_active_loans_total',
  help: 'Total number of active loans',
});

const paymentsTotal = new client.Counter({
  name: 'gbs_payments_total',
  help: 'Total number of payments processed',
  labelNames: ['method', 'status'],
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(activeLoansGauge);
register.registerMetric(paymentsTotal);

function startMetricsServer() {
  const server = http.createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.setHeader('Content-Type', register.contentType);
      res.end(await register.metrics());
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`Metrics server port ${config.metrics.port} in use. Standalone metrics listener skipped.`);
    } else {
      logger.error('Metrics server error:', err);
    }
  });

  try {
    server.listen(config.metrics.port, () => {
      logger.info(`Metrics server listening on port ${config.metrics.port}`);
    });
  } catch (err) {
    logger.warn(`Failed to listen on metrics port ${config.metrics.port}: ${err.message}`);
  }

  return server;
}

module.exports = {
  register,
  httpRequestDuration,
  httpRequestTotal,
  activeLoansGauge,
  paymentsTotal,
  startMetricsServer,
};
