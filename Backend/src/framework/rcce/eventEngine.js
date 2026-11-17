/**
 * GBS Central System Response, Control and Communication Engine (GBS-RCCE)
 * Event and Notification Engine
 * Standard: Node.js CommonJS
 */

const { prisma } = require('../../config/database');
const { emitToTenant, emitToDeveloper } = require('../../config/socket');
const logger = require('../../utils/logger');

class EventEngine {
  /**
   * Dispatch a structured system event
   * @param {Object} event
   * @param {string} event.eventType - e.g. TENANT_REGISTERED, LOAN_APPROVED, PAYMENT_RECEIVED
   * @param {string} [event.tenantId] - Recipient tenant ID
   * @param {string} [event.userId] - Recipient user ID (optional)
   * @param {string} event.title - Human-readable event headline
   * @param {string} event.message - Detailed explanation
   * @param {string} [event.category] - NotificationCategory enum
   * @param {Object} [event.metadata] - Extra structured payload
   */
  async dispatchEvent({
    eventType,
    tenantId = null,
    userId = null,
    title,
    message,
    category = 'SYSTEM_ALERT',
    metadata = {},
  }) {
    const timestamp = new Date().toISOString();
    const eventPayload = {
      eventType,
      tenantId,
      userId,
      title,
      message,
      category,
      metadata,
      timestamp,
    };

    logger.info(`[GBS-RCCE Event] ${eventType}: ${title}`);

    // 1. Broadcast real-time websocket notification
    try {
      if (tenantId) {
        emitToTenant(tenantId, 'rcce:event', eventPayload);
      }
      emitToDeveloper('rcce:developer-event', eventPayload);
    } catch (wsErr) {
      logger.warn(`WebSocket broadcast skipped: ${wsErr.message}`);
    }

    // 2. Persist in-app notification if userId or tenantId is targeted
    if (userId || tenantId) {
      try {
        await prisma.notification.create({
          data: {
            tenantId: tenantId || null,
            userId: userId || null,
            type: 'IN_APP',
            category: category in prisma.NotificationCategory ? category : 'SYSTEM_ALERT',
            status: 'DELIVERED',
            title,
            message,
            metadata: metadata || {},
          },
        });
      } catch (dbErr) {
        // Safe fallback if category is custom or table constrained
        logger.warn(`Notification DB persist failed: ${dbErr.message}`);
      }
    }

    return eventPayload;
  }
}

module.exports = new EventEngine();
