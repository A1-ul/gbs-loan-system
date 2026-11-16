const { prisma } = require('../config/database');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/errors');
const notificationService = require('./notification.service');

class FeedbackService {
  /**
   * Submit Feedback (Available to all users, staff, company owners, members, guests, and developers)
   */
  async submitFeedback(data = {}, user = null, reqMeta = {}) {
    const subject = String(data.subject || '').trim();
    const message = String(data.message || data.feedback || '').trim();

    if (!subject || !message) {
      throw new ValidationError('Feedback subject and detailed message are required.');
    }

    const tenantId = user?.tenantId || data.tenantId || null;
    const userId = user?.id || null;
    const submitterName = String(
      data.submitterName ||
      data.name ||
      (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') ||
      (reqMeta.isDeveloper ? 'System Developer' : 'System User')
    ).trim();

    const submitterEmail = String(data.submitterEmail || data.email || user?.email || '').trim() || null;
    const submitterPhone = String(data.submitterPhone || data.phone || user?.phone || '').trim() || null;
    const submitterRole = String(
      user?.role ||
      data.role ||
      (reqMeta.isDeveloper ? 'DEVELOPER' : 'GUEST_USER')
    ).toUpperCase();

    const category = String(data.category || 'GENERAL').toUpperCase();
    const rating = Math.min(Math.max(Number(data.rating) || 5, 1), 5);
    const deviceInfo = {
      ip: reqMeta.ipAddress || null,
      userAgent: reqMeta.userAgent || null,
      deviceFingerprint: reqMeta.deviceFingerprint || null,
      timestamp: new Date().toISOString(),
    };

    const rows = await prisma.$queryRawUnsafe(
      `
      INSERT INTO feedbacks (
        tenant_id, user_id, submitter_name, submitter_email, submitter_phone,
        submitter_role, category, rating, subject, message, status, device_info,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'RECEIVED', $11::jsonb, NOW(), NOW())
      RETURNING *
      `,
      tenantId,
      userId,
      submitterName,
      submitterEmail,
      submitterPhone,
      submitterRole,
      category,
      rating,
      subject,
      message,
      JSON.stringify(deviceInfo)
    );

    const feedback = rows[0];
    logger.info(`[Feedback] Received feedback #${feedback.id} from ${submitterName} (${submitterRole})`);

    // Asynchronously notify company owner or developer if applicable
    if (tenantId) {
      notificationService.queue({
        tenantId,
        type: 'IN_APP',
        category: 'SYSTEM_ALERT',
        title: `New User Feedback: ${subject}`,
        message: `${submitterName} (${submitterRole}) submitted feedback: "${message.slice(0, 100)}..."`,
      }).catch(() => null);
    }

    return feedback;
  }

  /**
   * Get Feedbacks (Developer gets global, Company Owner gets tenant-scoped, User gets own)
   */
  async getFeedbacks({ page = 1, limit = 50, status = null, category = null, search = null, tenantId = null } = {}, user = null, isDeveloper = false) {
    const offset = (Math.max(Number(page) || 1, 1) - 1) * Math.max(Number(limit) || 50, 1);
    const params = [];
    const conditions = [];

    if (isDeveloper) {
      // Developer can see all or filter by specific tenant
      if (tenantId) {
        params.push(tenantId);
        conditions.push(`tenant_id = $${params.length}`);
      }
    } else if (user) {
      const isOwnerOrAdmin = ['COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT', 'BOARD_EXECUTIVE', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'MANAGER'].includes(user.role);
      if (isOwnerOrAdmin && user.tenantId) {
        params.push(user.tenantId);
        conditions.push(`(tenant_id = $${params.length} OR tenant_id IS NULL)`);
      } else {
        // Regular staff or member sees their own feedback
        params.push(user.id);
        conditions.push(`user_id = $${params.length}`);
      }
    } else {
      // Unauthenticated callers cannot browse feedbacks
      return { data: [], total: 0, page: 1, limit: 50 };
    }

    if (status && status !== 'ALL') {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (category && category !== 'ALL') {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      const pIndex = params.length;
      conditions.push(`(subject ILIKE $${pIndex} OR message ILIKE $${pIndex} OR submitter_name ILIKE $${pIndex} OR submitter_email ILIKE $${pIndex})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int as total FROM feedbacks ${whereClause}`,
      ...params
    );
    const total = countRows[0]?.total || 0;

    params.push(limit);
    const limitParam = `$${params.length}`;
    params.push(offset);
    const offsetParam = `$${params.length}`;

    const data = await prisma.$queryRawUnsafe(
      `
      SELECT 
        f.id,
        f.tenant_id as "tenantId",
        f.user_id as "userId",
        f.submitter_name as "submitterName",
        f.submitter_email as "submitterEmail",
        f.submitter_phone as "submitterPhone",
        f.submitter_role as "submitterRole",
        f.category,
        f.rating,
        f.subject,
        f.message,
        f.status,
        f.developer_response as "developerResponse",
        f.owner_response as "ownerResponse",
        f.responded_by as "respondedBy",
        f.responded_at as "respondedAt",
        f.device_info as "deviceInfo",
        f.created_at as "createdAt",
        f.updated_at as "updatedAt",
        t.name as "tenantName",
        t.code as "tenantCode"
      FROM feedbacks f
      LEFT JOIN tenants t ON f.tenant_id = t.id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
      `,
      ...params
    );

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Respond to feedback (Company Owner or Developer)
   */
  async respondToFeedback(id, { responseMessage = '', status = 'RESOLVED' } = {}, responder = {}, isDeveloper = false) {
    const existing = await prisma.$queryRawUnsafe(`SELECT * FROM feedbacks WHERE id = $1::uuid`, id);
    if (!existing || existing.length === 0) {
      throw new NotFoundError('Feedback record not found');
    }

    const fb = existing[0];
    const responderName = responder.name || responder.username || responder.email || (isDeveloper ? 'Developer Authority' : 'Company Owner');
    const updateField = isDeveloper ? 'developer_response' : 'owner_response';

    const updatedRows = await prisma.$queryRawUnsafe(
      `
      UPDATE feedbacks
      SET 
        ${updateField} = $1,
        responded_by = $2,
        responded_at = NOW(),
        status = $3,
        updated_at = NOW()
      WHERE id = $4::uuid
      RETURNING *
      `,
      responseMessage,
      responderName,
      status,
      id
    );

    return updatedRows[0];
  }

  /**
   * Delete feedback (Developer Landlord or Company Owner)
   */
  async deleteFeedback(id, tenantId = null, isDeveloper = false) {
    if (isDeveloper) {
      await prisma.$queryRawUnsafe(`DELETE FROM feedbacks WHERE id = $1::uuid`, id);
    } else {
      await prisma.$queryRawUnsafe(`DELETE FROM feedbacks WHERE id = $1::uuid AND tenant_id = $2`, id, tenantId);
    }
    return { success: true, message: 'Feedback removed' };
  }
}

module.exports = new FeedbackService();
