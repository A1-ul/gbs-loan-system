/**
 * GBS Central System Response, Control and Communication Engine (GBS-RCCE)
 * Unified Export Module
 * Standard: Node.js CommonJS
 */

const { RESPONSE_CATALOG, resolveResponse } = require('./responseCatalog');
const { formatApiResponse, rcceResponseMiddleware } = require('./responseEngine');
const businessRules = require('./businessRules');
const eventEngine = require('./eventEngine');
const auditEngine = require('./auditEngine');

module.exports = {
  name: 'GBS-RCCE',
  version: '2.0.0',
  RESPONSE_CATALOG,
  resolveResponse,
  formatApiResponse,
  rcceResponseMiddleware,
  businessRules,
  eventEngine,
  auditEngine,
};
