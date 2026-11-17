/**
 * GBS Central System Response, Control and Communication Engine (GBS-RCCE)
 * Response Engine & Express Integration Middleware
 */

const { resolveResponse, RESPONSE_CATALOG } = require('./responseCatalog');

function formatApiResponse({
  success = true,
  code = 'OPERATION_SUCCESS',
  message = null,
  data = null,
  errors = null,
  requestId = 'req_unknown',
  timestamp = null,
}) {
  const catalogEntry = resolveResponse(code, message);
  return {
    success: Boolean(success),
    code: catalogEntry.code,
    message: catalogEntry.message,
    data: data !== undefined ? data : null,
    errors: errors ? (Array.isArray(errors) ? errors : [errors]) : null,
    timestamp: timestamp || new Date().toISOString(),
    requestId: String(requestId),
  };
}

function rcceResponseMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);

  res.rcce = function ({
    success = true,
    code = 'OPERATION_SUCCESS',
    message = null,
    data = null,
    errors = null,
    status = null,
  }) {
    const meta = resolveResponse(code, message, status);
    const payload = formatApiResponse({
      success,
      code: meta.code,
      message: meta.message,
      data,
      errors,
      requestId: req.id || req.headers['x-request-id'] || 'req_auto',
    });
    return res.status(meta.status).json(payload);
  };

  res.rcceSuccess = function (code = 'OPERATION_SUCCESS', data = null, customMessage = null) {
    return res.rcce({ success: true, code, data, message: customMessage });
  };

  res.rcceError = function (code = 'INTERNAL_ERROR', customMessage = null, status = null, errors = null) {
    return res.rcce({ success: false, code, message: customMessage, status, errors });
  };

  // Intercept standard res.json to ensure every response has the 7 standard fields
  res.json = function (body) {
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      if (!body.timestamp) {
        body.timestamp = new Date().toISOString();
      }
      if (!body.requestId) {
        body.requestId = req.id || req.headers['x-request-id'] || 'req_auto';
      }
      if (body.code === undefined) {
        body.code = body.success === false ? 'OPERATION_FAILED' : 'OPERATION_SUCCESS';
      }
      if (body.errors === undefined && body.success === false) {
        body.errors = null;
      }
    }
    return originalJson(body);
  };

  next();
}

module.exports = {
  RESPONSE_CATALOG,
  formatApiResponse,
  rcceResponseMiddleware,
};
