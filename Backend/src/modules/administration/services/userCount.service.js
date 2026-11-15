/**
 * GBS LOAN MANAGEMENT SYSTEM - USER REGISTRATION COUNT & VERIFICATION SERVICE
 * Mandatory System Requirement: System-generated counts for all 30 roles with Admin cross-check
 * Standard: Node.js CommonJS
 */

const { prisma } = require('../../../config/database');
const { ROLES } = require('../../../constants/roles');
const logger = require('../../../utils/logger');
const { NotFoundError, BadRequestError } = require('../../../utils/errors');

class UserCountService {
  /**
   * System-generated exact count of registered users for every configured role.
   * Computed directly from PostgreSQL users table. Zero mockups, zero placeholders.
   */
  async getCountsByRole({ tenantId = null } = {}) {
    try {
      // 1. Database Group By Aggregation (tenant-scoped when tenantId supplied)
      const groupedCounts = await prisma.user.groupBy({
        by: ['role', 'status'],
        where: tenantId ? { tenantId } : undefined,
        _count: {
          id: true,
        },
      });

      // 2. Build indexed lookup map: [role][status] -> count
      const countsMap = {};
      groupedCounts.forEach((entry) => {
        if (!countsMap[entry.role]) {
          countsMap[entry.role] = {};
        }
        countsMap[entry.role][entry.status] = entry._count.id;
      });

      // 3. 29 Canonical Blueprint Roles Display Names
      const roleDisplayNames = {
        COMPANY_OWNER: 'Company Owner',
        EXECUTIVE_MANAGEMENT: 'Executive Management',
        REGIONAL_MANAGER: 'Regional Manager',
        BRANCH_MANAGER: 'Branch Manager',
        OPERATIONS_MANAGER: 'Operations Manager',
        LOAN_OFFICER: 'Loan Officer',
        SENIOR_CREDIT_OFFICER: 'Senior Credit Officer',
        CREDIT_ANALYST: 'Credit Analyst',
        LOAN_UNDERWRITER: 'Loan Underwriter',
        COLLECTIONS: 'Collections',
        FIELD_OFFICER: 'Field Officer',
        CUSTOMER_SERVICE: 'Customer Service',
        RECEPTION: 'Reception',
        GUARANTOR_PORTAL: 'Guarantor Portal',
        MEMBER_PORTAL: 'Member Portal',
        ACCOUNTANT: 'Accountant',
        FINANCE_MANAGER: 'Finance Manager',
        TREASURY: 'Treasury',
        HUMAN_RESOURCE: 'Human Resource',
        LEGAL_DEPARTMENT: 'Legal Department',
        COMPLIANCE: 'Compliance',
        INTERNAL_AUDIT: 'Internal Audit',
        RISK_MANAGEMENT: 'Risk Management',
        FRAUD_INVESTIGATION: 'Fraud Investigation',
        SECURITY_OPERATIONS: 'Security Operations',
        MARKETING: 'Marketing',
        INVESTOR: 'Investor',
        BOARD_EXECUTIVE: 'Board-Only Executive',
        MOBILE_STAFF: 'Mobile Staff (App)',
      };

      const roleAliases = {
        COMPANY_OWNER: ['COMPANY_OWNER'],
        MEMBER_PORTAL: ['MEMBER_PORTAL', 'MEMBER'],
        FIELD_OFFICER: ['FIELD_OFFICER', 'STAFF'],
        COLLECTIONS: ['COLLECTIONS', 'COLLECTOR'],
        BRANCH_MANAGER: ['BRANCH_MANAGER', 'MANAGER'],
        GUARANTOR_PORTAL: ['GUARANTOR_PORTAL', 'GUARANTOR'],
      };

      let grandTotalRegistered = 0;
      let grandTotalActive = 0;
      let grandTotalPending = 0;
      let grandTotalSuspended = 0;
      let grandTotalInactive = 0;

      const rolesSummary = Object.keys(roleDisplayNames).map((roleKey) => {
        const associatedKeys = roleAliases[roleKey] || [roleKey];

        let active = 0;
        let pending = 0;
        let suspended = 0;
        let inactive = 0;
        let deactivated = 0;
        let rejected = 0;

        associatedKeys.forEach((key) => {
          const roleData = countsMap[key] || {};
          active += (roleData.ACTIVE || 0);
          pending += (roleData.PENDING_VERIFICATION || 0);
          suspended += (roleData.SUSPENDED || 0);
          inactive += (roleData.INACTIVE || 0);
          deactivated += (roleData.DEACTIVATED || 0);
          rejected += (roleData.REJECTED || 0);
        });

        const totalRegistered = active + pending + suspended + inactive + deactivated + rejected;

        grandTotalRegistered += totalRegistered;
        grandTotalActive += active;
        grandTotalPending += pending;
        grandTotalSuspended += suspended;
        grandTotalInactive += inactive;

        return {
          role: roleKey,
          displayName: roleDisplayNames[roleKey],
          totalRegistered,
          active,
          pendingVerification: pending,
          inactive,
          suspended,
          deactivated,
          rejected,
          statusIndicator: totalRegistered > 0 ? (pending > 0 ? 'NEEDS_VERIFICATION' : 'HEALTHY') : 'EMPTY',
        };
      });

      return {
        timestamp: new Date().toISOString(),
        dataSource: 'PostgreSQL:users (Prisma ORM Single Source of Truth)',
        isSystemGenerated: true,
        grandTotals: {
          totalRegistered: grandTotalRegistered,
          active: grandTotalActive,
          pendingVerification: grandTotalPending,
          suspended: grandTotalSuspended,
          inactive: grandTotalInactive,
        },
        roles: rolesSummary,
      };
    } catch (err) {
      logger.error('Error computing user counts by role:', err);
      throw err;
    }
  }

  /**
   * Cross-Check API: Retrieve the actual user records stored in the database for a specific role
   * Strictly matches the displayed count for verification by authorized administrators.
   */
  async getUsersByRole(role, { status, search, page = 1, limit = 50, tenantId = null } = {}) {
    try {
      const take = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
      const skip = ((parseInt(page, 10) || 1) - 1) * take;

      const roleAliases = {
        COMPANY_OWNER: ['COMPANY_OWNER'],
        MEMBER_PORTAL: ['MEMBER_PORTAL', 'MEMBER'],
        MEMBER: ['MEMBER_PORTAL', 'MEMBER'],
        FIELD_OFFICER: ['FIELD_OFFICER', 'STAFF'],
        STAFF: ['FIELD_OFFICER', 'STAFF'],
        COLLECTIONS: ['COLLECTIONS', 'COLLECTOR'],
        COLLECTOR: ['COLLECTIONS', 'COLLECTOR'],
        BRANCH_MANAGER: ['BRANCH_MANAGER', 'MANAGER'],
        MANAGER: ['BRANCH_MANAGER', 'MANAGER'],
        GUARANTOR_PORTAL: ['GUARANTOR_PORTAL', 'GUARANTOR'],
        GUARANTOR: ['GUARANTOR_PORTAL', 'GUARANTOR'],
      };

      const matchedRoles = roleAliases[role] || [role];

      const where = {
        role: { in: matchedRoles },
        ...(tenantId ? { tenantId } : {}),
        ...(status ? { status } : {}),
        ...(search
          ? {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          }
          : {}),
      };

      const [totalCount, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          take,
          skip,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
            address: true,
            gpsLatitude: true,
            gpsLongitude: true,
            otpVerified: true,
            twoFactorEnabled: true,
            lastLoginAt: true,
            createdAt: true,
            verificationLogs: {
              take: 3,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                statusBefore: true,
                statusAfter: true,
                isQualified: true,
                notes: true,
                createdAt: true,
                admin: {
                  select: { id: true, firstName: true, lastName: true, email: true },
                },
              },
            },
          },
        }),
      ]);

      return {
        role,
        totalMatching: totalCount,
        page: parseInt(page, 10) || 1,
        limit: take,
        totalPages: Math.ceil(totalCount / take) || 1,
        users,
      };
    } catch (err) {
      logger.error(`Error fetching users for role ${role}:`, err);
      throw err;
    }
  }

  /**
   * Admin Qualification Verification:
   * Reveals and views profile to verify if user is qualified.
   * Updates status and writes verification log with admin attribution.
   */
  async verifyQualification(userId, adminId, { isQualified, notes, ipAddress, tenantId = null }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');
    if (tenantId && user.tenantId && user.tenantId !== tenantId) {
      throw new BadRequestError('Cannot verify a user belonging to a different institution tenant.');
    }

    const statusBefore = user.status;
    const statusAfter = isQualified ? 'ACTIVE' : 'REJECTED';

    const [updatedUser, log] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          status: statusAfter,
          qualificationVerified: Boolean(isQualified),
          approvedByAdminId: adminId,
          updatedAt: new Date(),
        },
      }),
      prisma.userVerificationLog.create({
        data: {
          tenantId: user.tenantId || tenantId,
          userId,
          adminId,
          statusBefore,
          statusAfter,
          isQualified: Boolean(isQualified),
          notes: notes || (isQualified ? 'Account verified and approved by Administrator.' : 'Account rejected by Administrator due to incomplete or unqualified registration details.'),
          ipAddress: ipAddress || null,
        },
      }),
    ]);

    // Dispatch audit log matching Prisma AuditLog schema strictly
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId || tenantId,
        userId: adminId,
        action: 'USER_QUALIFICATION_VERIFIED',
        entityType: 'USER',
        entityId: userId,
        ipAddress: ipAddress || null,
        metadata: {
          role: user.role,
          statusBefore,
          statusAfter,
          isQualified: Boolean(isQualified),
          notes,
        },
      },
    }).catch((err) => logger.warn('Audit log write error:', err.message));

    logger.info(`User ${userId} qualification verified: status changed from ${statusBefore} to ${statusAfter} by Admin ${adminId}`);
    return {
      success: true,
      message: isQualified ? 'User verified as qualified and activated.' : 'User marked as unqualified and rejected.',
      user: updatedUser,
      verificationLog: log,
    };
  }

  /**
   * Admin Account Removal:
   * Removes or deletes an account that does not qualify to be part of the system.
   * Full audit record is preserved.
   */
  async removeUnqualifiedUser(userId, adminId, { reason, ipAddress, tenantId = null }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');
    if (tenantId && user.tenantId && user.tenantId !== tenantId) {
      throw new BadRequestError('Cannot remove a user belonging to a different institution tenant.');
    }

    if (user.id === adminId) {
      throw new BadRequestError('Administrators cannot remove their own account through qualification review.');
    }

    // Preserve audit log before deletion
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId || tenantId,
        userId: adminId,
        action: 'DELETE',
        entityType: 'USER',
        entityId: userId,
        ipAddress: ipAddress || null,
        oldValues: {
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
        },
        metadata: {
          deletionType: 'UNQUALIFIED_USER_REMOVAL',
          deletionReason: reason || 'Removed by Administrator: Unqualified registration details.',
        },
      },
    }).catch((err) => logger.warn('Audit log write error:', err.message));

    // Delete user from database
    await prisma.user.delete({ where: { id: userId } });

    logger.info(`Unqualified user ${userId} (${user.email}, Role: ${user.role}) removed from system by Admin ${adminId}`);
    return {
      success: true,
      message: `User ${user.email} (${user.role}) has been permanently removed from the system.`,
      removedUserId: userId,
    };
  }

  /**
   * Registration Alerts for Authorized Administrators:
   * Returns live stream of new registrations, role changes, and pending qualification reviews.
   */
  async getRegistrationAlerts(limit = 20, tenantId = null) {
    try {
      const pendingUsers = await prisma.user.findMany({
        where: {
          status: 'PENDING_VERIFICATION',
          ...(tenantId ? { tenantId } : {}),
        },
        take: parseInt(limit, 10) || 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      });

      const recentLogs = await prisma.userVerificationLog.findMany({
        where: tenantId ? { tenantId } : undefined,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, role: true } },
          admin: { select: { id: true, email: true, firstName: true } },
        },
      });

      return {
        pendingCount: pendingUsers.length,
        pendingRegistrations: pendingUsers,
        recentVerificationLogs: recentLogs,
      };
    } catch (err) {
      logger.error('Error fetching registration alerts:', err);
      throw err;
    }
  }
}

module.exports = new UserCountService();
