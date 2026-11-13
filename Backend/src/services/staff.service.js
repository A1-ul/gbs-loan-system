const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');
const logger = require('../utils/logger');
const { ROLES } = require('../constants');
const { NotFoundError, ConflictError, AuthorizationError, ValidationError } = require('../utils/errors');

const ALLOWED_STAFF_CREATION_ROLES = new Set(Object.values(ROLES));
const COLLECTOR_ROLES = new Set(['COLLECTIONS', 'FIELD_OFFICER', 'MOBILE_STAFF', 'COLLECTOR']);

function normalizePhoneNumber(rawPhone) {
  const cleaned = String(rawPhone || '').trim();
  if (/^0\d{9}$/.test(cleaned)) return `+233${cleaned.slice(1)}`;
  return cleaned;
}

async function create(data) {
  const employeeId = data.employeeId || `EMP-${Date.now().toString().slice(-6)}`;
  const staff = await prisma.staff.create({
    data: {
      tenantId: data.tenantId || null,
      branchId: data.branchId || null,
      userId: data.userId,
      employeeId,
      department: data.department || 'Operations',
      position: data.position || 'Loan Officer',
      hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
      baseSalary: Number(data.baseSalary || 2500),
    },
    include: { user: true },
  });
  logger.info(`Staff record created: ${staff.employeeId}`);
  return staff;
}

/**
 * Full 30-Role Institutional Staff Creation with Credentials, GPS Address & Company Owner Approval Gate
 */
async function registerStaffUser(creatorUser, payload = {}) {
  const tenantId = payload.tenantId || creatorUser?.tenantId;
  if (!tenantId) {
    throw new ValidationError('Active approved organization is required to create staff accounts.');
  }

  const creatorRole = String(creatorUser?.role || '').toUpperCase();
  const canCreateStaff = [
    'SUPER_ADMIN', 'COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT', 'BOARD_EXECUTIVE',
    'REGIONAL_MANAGER', 'BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'MANAGER', 'HUMAN_RESOURCE',
  ].includes(creatorRole);
  if (!canCreateStaff) {
    throw new AuthorizationError('Only Company Owner or authorized Management/HR can register staff.');
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new NotFoundError('Tenant organization');
  if (['PENDING', 'VERIFICATION_REQUIRED', 'REJECTED'].includes(tenant.onboardingStatus)) {
    throw new AuthorizationError(
      `Institution "${tenant.name}" must be approved by Developer Authority before staff can be created.`
    );
  }
  if (['LOCKED_EXPIRED', 'SUSPENDED'].includes(tenant.status)) {
    throw new AuthorizationError(`Institution "${tenant.name}" is currently ${tenant.status}.`);
  }

  const normalizedRole = String(payload.role || 'LOAN_OFFICER').toUpperCase().replace(/-/g, '_');
  if (!ALLOWED_STAFF_CREATION_ROLES.has(normalizedRole)) {
    throw new ValidationError(`Invalid role "${payload.role}". Must be one of the 30 canonical roles.`);
  }

  const email = String(payload.email || '').toLowerCase().trim();
  const phone = normalizePhoneNumber(payload.phone);
  const password = String(payload.password || '').trim();
  const firstName = String(payload.firstName || '').trim();
  const lastName = String(payload.lastName || '').trim();

  if (!email || !phone || !firstName || !lastName || password.length < 6) {
    throw new ValidationError('First name, last name, email, phone, and password (min 6 chars) are required.');
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { phone },
        ...(payload.phone ? [{ phone: String(payload.phone).trim() }] : []),
      ],
    },
  });
  if (existing) {
    throw new ConflictError('An account with this email or mobile number already exists.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const isOwnerCreator = ['SUPER_ADMIN', 'COMPANY_OWNER'].includes(creatorRole);
  const shouldActivateImmediately = isOwnerCreator && payload.autoApprove !== false;
  const userStatus = shouldActivateImmediately ? 'ACTIVE' : 'AWAITING_APPROVAL';
  const count = await prisma.staff.count();
  const employeeId = payload.employeeId || `EMP-${String(count + 1).padStart(4, '0')}-${Math.floor(10 + Math.random() * 89)}`;

  const createdRecord = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        tenantId,
        branchId: payload.branchId || creatorUser.branchId || null,
        email,
        username: email.split('@')[0],
        phone,
        passwordHash,
        role: normalizedRole,
        firstName,
        lastName,
        address: payload.address ? String(payload.address).trim() : null,
        gpsAddress: payload.gpsAddress ? String(payload.gpsAddress).trim().toUpperCase() : null,
        gpsLatitude: payload.gpsLatitude != null && payload.gpsLatitude !== '' ? Number(payload.gpsLatitude) : null,
        gpsLongitude: payload.gpsLongitude != null && payload.gpsLongitude !== '' ? Number(payload.gpsLongitude) : null,
        status: userStatus,
        otpVerified: shouldActivateImmediately,
        isPhoneVerified: shouldActivateImmediately,
        qualificationVerified: shouldActivateImmediately,
      },
      select: {
        id: true, email: true, phone: true, role: true, status: true,
        firstName: true, lastName: true, gpsAddress: true, gpsLatitude: true, gpsLongitude: true,
        qualificationVerified: true, tenantId: true, branchId: true,
      },
    });

    const staff = await tx.staff.create({
      data: {
        tenantId,
        branchId: user.branchId,
        userId: user.id,
        employeeId,
        department: payload.department || normalizedRole.replace(/_/g, ' '),
        position: payload.position || normalizedRole.replace(/_/g, ' '),
        hireDate: payload.hireDate ? new Date(payload.hireDate) : new Date(),
        baseSalary: Number(payload.baseSalary || 2500),
      },
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, email: true, phone: true,
            role: true, status: true, gpsAddress: true, gpsLatitude: true, gpsLongitude: true,
            qualificationVerified: true,
          },
        },
      },
    });

    if (COLLECTOR_ROLES.has(normalizedRole)) {
      await tx.collector.create({
        data: {
          tenantId,
          branchId: user.branchId,
          userId: user.id,
          employeeId,
          status: 'OFFLINE',
          lastLatitude: user.gpsLatitude,
          lastLongitude: user.gpsLongitude,
        },
      }).catch(() => { });
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        userId: creatorUser.id,
        action: 'CREATE',
        entityType: 'staff',
        entityId: staff.id,
        metadata: {
          subAction: 'STAFF_ACCOUNT_CREATED',
          createdUserId: user.id,
          role: normalizedRole,
          status: userStatus,
          gpsAddress: user.gpsAddress,
        },
      },
    }).catch(() => { });

    return staff;
  });

  logger.info(`[StaffService] Staff ${createdRecord.employeeId} (${normalizedRole}) created with status ${userStatus}`);
  return {
    ...createdRecord,
    requiresOwnerApproval: userStatus !== 'ACTIVE',
  };
}

async function getPendingStaffApprovals(tenantId) {
  if (!tenantId) return [];
  return prisma.user.findMany({
    where: {
      tenantId,
      deletedAt: null,
      role: { notIn: ['MEMBER', 'MEMBER_PORTAL', 'GUARANTOR', 'GUARANTOR_PORTAL'] },
      OR: [
        { status: { in: ['AWAITING_APPROVAL', 'PENDING_VERIFICATION'] } },
        { qualificationVerified: false },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      gpsAddress: true,
      qualificationVerified: true,
      createdAt: true,
      staffProfile: { select: { id: true, employeeId: true, department: true, position: true, baseSalary: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

async function approveStaffAccount(approverUser, targetId, { approve = true, notes = '' } = {}) {
  const role = String(approverUser?.role || '').toUpperCase();
  if (!['SUPER_ADMIN', 'COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT', 'BOARD_EXECUTIVE', 'BRANCH_MANAGER'].includes(role)) {
    throw new AuthorizationError('Only Company Owner or Executive Authority can approve staff portal access.');
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [{ id: targetId }, { staffProfile: { id: targetId } }, { staffProfile: { employeeId: targetId } }],
      deletedAt: null,
    },
    include: { staffProfile: true },
  });

  if (!targetUser) throw new NotFoundError('Target staff account');
  if (approverUser.tenantId && targetUser.tenantId !== approverUser.tenantId) {
    throw new AuthorizationError('Cross-tenant staff approval forbidden.');
  }

  const nextStatus = approve ? 'ACTIVE' : 'SUSPENDED';
  const updated = await prisma.user.update({
    where: { id: targetUser.id },
    data: {
      status: nextStatus,
      qualificationVerified: Boolean(approve),
      otpVerified: Boolean(approve),
      isPhoneVerified: Boolean(approve),
    },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true,
      role: true, status: true, qualificationVerified: true, gpsAddress: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: targetUser.tenantId,
      userId: approverUser.id,
      action: approve ? 'APPROVE' : 'REJECT',
      entityType: 'user',
      entityId: targetUser.id,
      metadata: { subAction: approve ? 'STAFF_APPROVED_BY_OWNER' : 'STAFF_REJECTED_BY_OWNER', targetRole: targetUser.role, notes },
    },
  }).catch(() => { });

  return updated;
}

async function getAll({ page = 1, limit = 50, tenantId = null, search = null, includeHidden = false }) {
  const skip = (page - 1) * limit;
  const where = {
    ...(tenantId ? { tenantId } : {}),
    ...(includeHidden ? {} : { user: { isHidden: false } }),
  };

  if (search && String(search).trim()) {
    const q = String(search).trim();
    where.OR = [
      { employeeId: { contains: q, mode: 'insensitive' } },
      { department: { contains: q, mode: 'insensitive' } },
      { position: { contains: q, mode: 'insensitive' } },
      { user: { firstName: { contains: q, mode: 'insensitive' } } },
      { user: { lastName: { contains: q, mode: 'insensitive' } } },
      { user: { phone: { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
      { user: { gpsAddress: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.staff.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, email: true, phone: true,
            role: true, status: true, qualificationVerified: true,
            gpsAddress: true, gpsLatitude: true, gpsLongitude: true, isHidden: true,
          },
        },
        branch: { select: { id: true, name: true } },
        salaryProfile: { include: { qualificationLevel: true, salaryGrade: true, salaryStep: true, serviceBand: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.staff.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getById(id) {
  const staff = await prisma.staff.findFirst({
    where: { OR: [{ id }, { userId: id }, { employeeId: id }] },
    include: {
      user: {
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true,
          role: true, status: true, gpsAddress: true, gpsLatitude: true, gpsLongitude: true,
          qualificationVerified: true, isHidden: true,
        },
      },
      branch: { select: { id: true, name: true, city: true } },
      salaryProfile: { include: { qualificationLevel: true, salaryGrade: true, salaryStep: true, serviceBand: true, incrementHistory: true } },
      salaries: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!staff) throw new NotFoundError(`Staff record '${id}'`);
  return staff;
}

async function update(id, data) {
  const staff = await getById(id);
  if (data.gpsAddress !== undefined || data.isHidden !== undefined || data.gpsLatitude !== undefined || data.gpsLongitude !== undefined) {
    await prisma.user.update({
      where: { id: staff.userId },
      data: {
        ...(data.gpsAddress !== undefined ? { gpsAddress: data.gpsAddress ? String(data.gpsAddress).trim().toUpperCase() : null } : {}),
        ...(data.isHidden !== undefined ? { isHidden: Boolean(data.isHidden) } : {}),
        ...(data.gpsLatitude !== undefined ? { gpsLatitude: Number(data.gpsLatitude) } : {}),
        ...(data.gpsLongitude !== undefined ? { gpsLongitude: Number(data.gpsLongitude) } : {}),
      },
    });
  }

  return prisma.staff.update({
    where: { id: staff.id },
    data: {
      ...(data.department !== undefined ? { department: data.department } : {}),
      ...(data.position !== undefined ? { position: data.position } : {}),
      ...(data.baseSalary !== undefined ? { baseSalary: Number(data.baseSalary) } : {}),
      ...(data.isActive !== undefined ? { isActive: Boolean(data.isActive) } : {}),
    },
    include: { user: true, salaryProfile: true },
  });
}

async function deactivate(id) {
  const staff = await getById(id);
  await prisma.$transaction(async (tx) => {
    await tx.staff.update({ where: { id: staff.id }, data: { isActive: false } });
    await tx.user.update({ where: { id: staff.userId }, data: { status: 'DEACTIVATED' } });
  });
  logger.warn(`Staff record deactivated: ${staff.employeeId}`);
  return { deactivated: true, employeeId: staff.employeeId };
}

module.exports = {
  create,
  registerStaffUser,
  getPendingStaffApprovals,
  approveStaffAccount,
  getAll,
  getById,
  update,
  deactivate,
};
