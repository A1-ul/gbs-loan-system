/**
 * GBS Central System Response, Control and Communication Engine (GBS-RCCE)
 * Central Business Rules Engine
 * Standard: Node.js CommonJS
 */

const { ValidationError, ForbiddenError, ConflictError } = require('../../utils/errors');

// In-memory idempotency cache (keyed with 10-minute TTL)
const idempotencyStore = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of idempotencyStore.entries()) {
    if (now - entry.timestamp > 10 * 60 * 1000) {
      idempotencyStore.delete(key);
    }
  }
}, 60 * 1000);

class BusinessRulesEngine {
  /**
   * Enforce Idempotency / Duplicate Submission Protection
   */
  checkIdempotency(req, keyIdentifier = null) {
    const rawKey = keyIdentifier || req.headers['x-idempotency-key'] || req.body?.idempotencyKey;
    if (!rawKey) return null;

    const scopedKey = `${req.user?.tenantId || 'global'}:${req.user?.id || 'anon'}:${rawKey}`;
    const existing = idempotencyStore.get(scopedKey);

    if (existing) {
      if (existing.status === 'IN_PROGRESS') {
        throw new ConflictError('A matching transaction is currently in progress. Please wait.');
      }
      return existing.cachedResponse;
    }

    idempotencyStore.set(scopedKey, { status: 'IN_PROGRESS', timestamp: Date.now() });
    return null;
  }

  recordIdempotencyResult(req, keyIdentifier, responsePayload) {
    const rawKey = keyIdentifier || req.headers['x-idempotency-key'] || req.body?.idempotencyKey;
    if (!rawKey) return;
    const scopedKey = `${req.user?.tenantId || 'global'}:${req.user?.id || 'anon'}:${rawKey}`;
    idempotencyStore.set(scopedKey, {
      status: 'COMPLETED',
      cachedResponse: responsePayload,
      timestamp: Date.now(),
    });
  }

  /**
   * Validate Required Inputs
   */
  validateRequiredFields(data, fields = []) {
    const missing = [];
    for (const f of fields) {
      if (data[f] === undefined || data[f] === null || data[f] === '') {
        missing.push(f);
      }
    }
    if (missing.length > 0) {
      throw new ValidationError(`Required information missing: ${missing.join(', ')}`);
    }
  }

  /**
   * Validate Ghana Card Number Format (e.g. GHA-123456789-0)
   */
  validateGhanaCard(ghanaCardNumber) {
    if (!ghanaCardNumber) return false;
    const regex = /^GHA-\d{9}-\d$/i;
    return regex.test(String(ghanaCardNumber).trim());
  }

  /**
   * Validate Phone Number (Ghana standard 10 digits or international +233)
   */
  validatePhone(phone) {
    if (!phone) return false;
    const cleaned = String(phone).replace(/[\s-]/g, '');
    return /^(0|\+233)[235][0-9]{8}$/.test(cleaned);
  }

  /**
   * Validate Financial Amount (must be strictly positive number)
   */
  validatePositiveAmount(amount, fieldName = 'Amount') {
    const num = Number(amount);
    if (Number.isNaN(num) || num <= 0) {
      throw new ValidationError(`${fieldName} must be a valid positive amount.`);
    }
    return num;
  }

  /**
   * Validate Allowed Status Transitions
   */
  validateStatusTransition(currentStatus, requestedStatus, allowedMap = {}) {
    const allowed = allowedMap[currentStatus] || [];
    if (!allowed.includes(requestedStatus)) {
      throw new ValidationError(
        `Invalid status change from ${currentStatus} to ${requestedStatus}. Allowed transitions: ${allowed.join(', ') || 'None'}`
      );
    }
  }

  /**
   * Tenant Data Isolation Check
   */
  assertTenantAccess(user, targetTenantId) {
    if (!user) throw new ForbiddenError('Authentication required.');
    if (user.role === 'DEVELOPER' || user.isDeveloper) return true; // Landlord super-scope
    if (user.tenantId !== targetTenantId) {
      throw new ForbiddenError('Tenant isolation violation: Access to other institution data is strictly prohibited.');
    }
    return true;
  }
}

module.exports = new BusinessRulesEngine();
