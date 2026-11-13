const { v4: uuidv4 } = require('uuid');

/**
 * API Gateway Request Tracking & Correlation Middleware
 * Attaches a unique requestId to incoming requests and sets X-Request-Id and X-Response-Time headers.
 */
function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  const requestId = incomingId || `req_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  const startHrTime = process.hrtime();

  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6).toFixed(2);
    // Setting header before finish or in middleware
    try {
      res.setHeader('X-Response-Time', `${elapsedTimeInMs}ms`);
    } catch (_) {
      // Ignore if headers already sent
    }
  });

  next();
}

module.exports = {
  requestIdMiddleware,
};
