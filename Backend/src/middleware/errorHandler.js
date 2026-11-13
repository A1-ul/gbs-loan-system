const { AppError } = require('../utils/errors');
const { prisma } = require('../config/database');
const { HTTP_STATUS } = require('../constants');
const logger = require('../utils/logger');

function notFoundHandler(req, res, next) {
  next(new AppError(`Route ${req.originalUrl} not found`, HTTP_STATUS.NOT_FOUND, 'ROUTE_NOT_FOUND'));
}

function recordUnhandledCrashAsync(err, req) {
  if (process.env.NODE_ENV === 'test') return;
  prisma.aIDiagnosticLog.create({
    data: {
      issueType: err.code || err.name || 'UNHANDLED_SERVER_ERROR',
      severity: 'HIGH',
      description: `${req.method} ${req.originalUrl}: ${err.message}`.slice(0, 1000),
      stackTrace: err.stack ? String(err.stack).slice(0, 4000) : null,
      recommendedFix: 'Review endpoint validation, PostgreSQL constraints, or service preconditions.',
      autoFixed: false,
    },
  }).catch(() => {});
}

function errorHandler(err, req, res, next) {
  const requestId = req.id || req.headers['x-request-id'] || 'req_unknown';
  const timestamp = new Date().toISOString();

  logger.error('API Error Encountered:', {
    message: err.message,
    name: err.name,
    code: err.code,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
    requestId,
  });

  // 1. Prisma Known Request Errors
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      const targetFields = err.meta?.target ? (Array.isArray(err.meta.target) ? err.meta.target.join(', ') : err.meta.target) : 'unique field';
      return res.status(HTTP_STATUS.CONFLICT || 409).json({
        success: false,
        message: `Conflict: An entity with this ${targetFields} already exists in database`,
        code: 'DUPLICATE_RESOURCE',
        requestId,
        timestamp,
      });
    }

    if (err.code === 'P2025') {
      return res.status(HTTP_STATUS.NOT_FOUND || 404).json({
        success: false,
        message: 'The requested record was not found in the database',
        code: 'RECORD_NOT_FOUND',
        requestId,
        timestamp,
      });
    }

    if (err.code === 'P2003') {
      return res.status(HTTP_STATUS.BAD_REQUEST || 400).json({
        success: false,
        message: 'Database relationship constraint violation (foreign key missing or invalid)',
        code: 'FOREIGN_KEY_VIOLATION',
        requestId,
        timestamp,
      });
    }
  }

  // 2. SyntaxError (e.g. malformed JSON in request payload)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(HTTP_STATUS.BAD_REQUEST || 400).json({
      success: false,
      message: 'Malformed JSON payload provided in request body',
      code: 'MALFORMED_JSON',
      requestId,
      timestamp,
    });
  }

  // 3. Operational AppError (including ValidationError, AuthenticationError, AuthorizationError)
  if (err.isOperational) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message,
      code: err.code || 'OPERATIONAL_ERROR',
      ...(err.errors && { errors: err.errors }),
      requestId,
      timestamp,
    });
  }

  // 4. Fallback Internal Server Error -> persist crash diagnostic automatically
  recordUnhandledCrashAsync(err, req);
  return res.status(HTTP_STATUS.INTERNAL_ERROR || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
    requestId,
    timestamp,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
