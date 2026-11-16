const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');
const logger = require('../utils/logger');
const { ROLES } = require('../constants');
const { NotFoundError, ConflictError, AuthorizationError, ValidationError } = require('../utils/errors');
const notificationService = require('./notification.service');

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
    'COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT', 'BOARD_EXECUTIVE',
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

  // Strict Live Camera Capture Requirement (Mandatory for all staff excluding developer)
  const livePhoto = payload.livePhoto || payload.profilePicture || payload.cameraShot;
  if (!livePhoto && creatorRole !== 'DEVELOPER') {
    throw new ValidationError('A live camera capture shot is strictly required before completing staff registration.');
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
  const isOwnerCreator = ['COMPANY_OWNER'].includes(creatorRole);
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
        profilePicture: livePhoto || null,
        address: payload.address ? String(payload.address).trim() : null,
        gpsAddress: payload.gpsAddress ? String(payload.gpsAddress).trim().toUpperCase() : null,
        gpsLatitude: payload.gpsLatitude != null && payload.gpsLatitude !== '' ? Number(payload.gpsLatitude) : null,
        gpsLongitude: payload.gpsLongitude != null && payload.gpsLongitude !== '' ? Number(payload.gpsLongitude) : null,
        status: userStatus,
        otpVerified: shouldActivateImmediately,
        isPhoneVerified: shouldActivateImmediately,
        qualificationVerified: shouldActivateImmediately,
        metadata: {
          liveCameraCaptured: Boolean(livePhoto),
          liveCameraShot: livePhoto || null,
          cameraCapturedAt: livePhoto ? new Date().toISOString() : null,
          approvalStage: shouldActivateImmediately ? 'BRANCH_MANAGER_APPROVED' : 'AWAITING_OWNER_APPROVAL',
          employedByBranchManagerId: !isOwnerCreator ? creatorUser.id : null,
          employedByBranchManagerName: !isOwnerCreator ? `${creatorUser.firstName || ''} ${creatorUser.lastName || ''}`.trim() : null,
          employmentRequestedAt: new Date().toISOString(),
          requestedRole: normalizedRole,
        },
      },
      select: {
        id: true, email: true, phone: true, role: true, status: true,
        firstName: true, lastName: true, gpsAddress: true, gpsLatitude: true, gpsLongitude: true,
        profilePicture: true, metadata: true, qualificationVerified: true, tenantId: true, branchId: true,
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

async function getPendingStaffApprovals(tenantId, user = null) {
  if (!tenantId) return [];
  const callerRole = user?.role ? String(user.role).toUpperCase() : '';
  const isBranchManager = ['BRANCH_MANAGER', 'OPERATIONS_MANAGER'].includes(callerRole);

  const where = {
    tenantId,
    deletedAt: null,
    role: { notIn: ['MEMBER', 'MEMBER_PORTAL', 'GUARANTOR', 'GUARANTOR_PORTAL'] },
    OR: [
      { status: { in: ['AWAITING_APPROVAL', 'PENDING_VERIFICATION'] } },
      { qualificationVerified: false },
    ],
  };

  if (isBranchManager && user?.branchId) {
    where.branchId = user.branchId;
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      gpsAddress: true,
      gpsLatitude: true,
      gpsLongitude: true,
      profilePicture: true,
      metadata: true,
      qualificationVerified: true,
      createdAt: true,
      branch: { select: { id: true, name: true, code: true, city: true } },
      staffProfile: { select: { id: true, employeeId: true, department: true, position: true, baseSalary: true, hireDate: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return users.map((u) => {
    const meta = u.metadata || {};
    const approvalStage = meta.approvalStage || (u.status === 'ACTIVE' ? 'BRANCH_MANAGER_APPROVED' : 'AWAITING_OWNER_APPROVAL');
    return {
      ...u,
      liveCameraShot: u.profilePicture || meta.liveCameraShot || null,
      liveCameraCaptured: Boolean(u.profilePicture || meta.liveCameraCaptured),
      approvalStage,
      isAwaitingOwnerApproval: approvalStage === 'AWAITING_OWNER_APPROVAL',
      isOwnerApproved: ['OWNER_APPROVED_AWAITING_BRANCH', 'OWNER_APPROVED', 'BRANCH_MANAGER_APPROVED'].includes(approvalStage),
      isAwaitingBranchApproval: approvalStage === 'OWNER_APPROVED_AWAITING_BRANCH',
      employedByBranchManagerName: meta.employedByBranchManagerName || meta.branchManagerName || null,
      employmentRequestedAt: meta.employmentRequestedAt || u.createdAt,
      ownerApprovedAt: meta.ownerApprovedAt || null,
      ownerApprovedByName: meta.ownerApprovedByName || null,
      branchApprovedAt: meta.branchApprovedAt || null,
      branchManagerName: meta.branchManagerName || null,
    };
  });
}

/**
 * Step 1: Company Owner Approves employment request so Branch Manager can grant final approval
 */
async function ownerApproveStaff(ownerUser, targetId, { notes = '', baseSalary = null } = {}) {
  const role = String(ownerUser?.role || '').toUpperCase();
  if (!['COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT', 'BOARD_EXECUTIVE'].includes(role)) {
    throw new AuthorizationError('Only Company Owner or Executive Authority can approve new staff employment requests.');
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [{ id: targetId }, { staffProfile: { id: targetId } }, { staffProfile: { employeeId: targetId } }],
      deletedAt: null,
    },
    include: { staffProfile: true, branch: true },
  });

  if (!targetUser) throw new NotFoundError('Target staff account not found');
  if (ownerUser.tenantId && targetUser.tenantId !== ownerUser.tenantId) {
    throw new AuthorizationError('Cross-tenant staff approval is forbidden.');
  }

  const currentMeta = targetUser.metadata || {};
  const ownerName = `${ownerUser.firstName || ''} ${ownerUser.lastName || ''}`.trim() || 'Company Owner';
  const updatedMeta = {
    ...currentMeta,
    approvalStage: 'OWNER_APPROVED_AWAITING_BRANCH',
    ownerApprovedAt: new Date().toISOString(),
    ownerApprovedById: ownerUser.id,
    ownerApprovedByName: ownerName,
    ownerNotes: notes || 'Approved by Company Owner for Branch Manager finalization',
  };

  const updatedUser = await prisma.user.update({
    where: { id: targetUser.id },
    data: {
      status: 'AWAITING_APPROVAL',
      metadata: updatedMeta,
    },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true,
      role: true, status: true, profilePicture: true, metadata: true,
    },
  });

  if (baseSalary && targetUser.staffProfile) {
    await prisma.staff.update({
      where: { id: targetUser.staffProfile.id },
      data: { baseSalary: Number(baseSalary) },
    }).catch(() => null);
  }

  await prisma.auditLog.create({
    data: {
      tenantId: targetUser.tenantId,
      userId: ownerUser.id,
      action: 'APPROVE',
      entityType: 'staff',
      entityId: targetUser.id,
      metadata: {
        subAction: 'STAFF_EMPLOYMENT_OWNER_APPROVED',
        targetRole: targetUser.role,
        approvalStage: 'OWNER_APPROVED_AWAITING_BRANCH',
        notes,
      },
    },
  }).catch(() => { });

  // Notify Branch Manager that Company Owner has approved
  const branchId = targetUser.branchId || targetUser.staffProfile?.branchId;
  if (branchId) {
    const branchManagers = await prisma.user.findMany({
      where: {
        tenantId: targetUser.tenantId,
        branchId,
        role: { in: ['BRANCH_MANAGER', 'OPERATIONS_MANAGER'] },
      },
      select: { id: true },
    }).catch(() => []);

    for (const bm of branchManagers) {
      notificationService.queue({
        tenantId: targetUser.tenantId,
        userId: bm.id,
        type: 'IN_APP',
        category: 'STAFF_NOTICE',
        title: 'Employment Request Approved by Company Owner',
        message: `Company Owner has approved employment of ${targetUser.firstName} ${targetUser.lastName} (${targetUser.role}). You may now grant final branch approval to activate the employee.`,
      }).catch(() => null);
    }
  }

  return {
    ...updatedUser,
    message: 'Employment request approved by Company Owner. Now awaiting Branch Manager final approval.',
    approvalStage: 'OWNER_APPROVED_AWAITING_BRANCH',
  };
}

/**
 * Step 2: Branch Manager Grants Final Approval & Activates Staff Account
 */
async function branchApproveStaff(branchUser, targetId, { notes = '', position = null, department = null } = {}) {
  const role = String(branchUser?.role || '').toUpperCase();
  const isBranchMgr = ['BRANCH_MANAGER', 'OPERATIONS_MANAGER', 'REGIONAL_MANAGER'].includes(role);
  const isOwner = ['COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT', 'BOARD_EXECUTIVE'].includes(role);

  if (!isBranchMgr && !isOwner) {
    throw new AuthorizationError('Only Branch Manager or Company Owner can grant final staff employment approval.');
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [{ id: targetId }, { staffProfile: { id: targetId } }, { staffProfile: { employeeId: targetId } }],
      deletedAt: null,
    },
    include: { staffProfile: true, branch: true },
  });

  if (!targetUser) throw new NotFoundError('Target staff account not found');
  if (branchUser.tenantId && targetUser.tenantId !== branchUser.tenantId) {
    throw new AuthorizationError('Cross-tenant staff approval is forbidden.');
  }

  const meta = targetUser.metadata || {};
  const currentStage = meta.approvalStage;

  // Strict Enforce: Company Owner must have approved before Branch Manager can approve (unless Company Owner is approving directly)
  if (!isOwner && currentStage !== 'OWNER_APPROVED_AWAITING_BRANCH' && currentStage !== 'OWNER_APPROVED') {
    throw new AuthorizationError(
      'Company Owner approval is strictly required before the Branch Manager can finalize employment for this staff.'
    );
  }

  const bmName = `${branchUser.firstName || ''} ${branchUser.lastName || ''}`.trim() || 'Branch Manager';
  const updatedMeta = {
    ...meta,
    approvalStage: 'BRANCH_MANAGER_APPROVED',
    branchApprovedAt: new Date().toISOString(),
    branchApprovedById: branchUser.id,
    branchManagerName: bmName,
    branchNotes: notes || 'Employment finalized by Branch Manager',
  };

  const updatedUser = await prisma.user.update({
    where: { id: targetUser.id },
    data: {
      status: 'ACTIVE',
      qualificationVerified: true,
      otpVerified: true,
      isPhoneVerified: true,
      metadata: updatedMeta,
    },
    select: {
      id: true, firstName: true, lastName: true, email: true, phone: true,
      role: true, status: true, profilePicture: true, metadata: true, qualificationVerified: true,
    },
  });

  if (targetUser.staffProfile && (position || department)) {
    await prisma.staff.update({
      where: { id: targetUser.staffProfile.id },
      data: {
        ...(position ? { position } : {}),
        ...(department ? { department } : {}),
      },
    }).catch(() => null);
  }

  await prisma.auditLog.create({
    data: {
      tenantId: targetUser.tenantId,
      userId: branchUser.id,
      action: 'APPROVE',
      entityType: 'staff',
      entityId: targetUser.id,
      metadata: {
        subAction: 'STAFF_EMPLOYED_AND_ACTIVATED_BY_BRANCH_MANAGER',
        targetRole: targetUser.role,
        branchApprovedBy: bmName,
        notes,
      },
    },
  }).catch(() => { });

  // Notify Company Owner
  const companyOwners = await prisma.user.findMany({
    where: { tenantId: targetUser.tenantId, role: 'COMPANY_OWNER' },
    select: { id: true },
  }).catch(() => []);

  for (const co of companyOwners) {
    notificationService.queue({
      tenantId: targetUser.tenantId,
      userId: co.id,
      type: 'IN_APP',
      category: 'STAFF_NOTICE',
      title: 'New Staff Employed & Activated by Branch Manager',
      message: `Branch Manager ${bmName} has given final approval to employ ${targetUser.firstName} ${targetUser.lastName} (${targetUser.role}) with live camera verification.`,
    }).catch(() => null);
  }

  return {
    ...updatedUser,
    message: 'Staff account successfully approved, employed, and activated by Branch Manager.',
    approvalStage: 'BRANCH_MANAGER_APPROVED',
  };
}

/**
 * Step 3: Company Owner Verification List of Staff Employed or Approved by Branch Managers
 * Displays full profile, department, salary, branch, and mandatory live camera shot taken during registration.
 */
async function getBranchApprovedStaff(tenantId, { search = null, branchId = null, limit = 100 } = {}) {
  if (!tenantId) return [];

  const where = {
    tenantId,
    deletedAt: null,
    role: { notIn: ['MEMBER', 'MEMBER_PORTAL', 'GUARANTOR', 'GUARANTOR_PORTAL'] },
  };

  if (branchId) {
    where.branchId = branchId;
  }

  if (search && String(search).trim()) {
    const q = String(search).trim();
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { staffProfile: { employeeId: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    take: Number(limit) || 100,
    include: {
      staffProfile: true,
      branch: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  return users
    .filter((u) => {
      const meta = u.metadata || {};
      const stage = meta.approvalStage;
      return (
        stage === 'BRANCH_MANAGER_APPROVED' ||
        Boolean(meta.branchApprovedAt) ||
        Boolean(meta.employedByBranchManagerId) ||
        (u.status === 'ACTIVE' && meta.liveCameraCaptured)
      );
    })
    .map((u) => {
      const meta = u.metadata || {};
      return {
        id: u.id,
        staffId: u.staffProfile?.id || null,
        employeeId: u.staffProfile?.employeeId || `EMP-${u.id.slice(0, 6)}`,
        fullName: `${u.firstName} ${u.lastName}`,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        role: u.role,
        department: u.staffProfile?.department || 'Operations',
        position: u.staffProfile?.position || u.role.replace(/_/g, ' '),
        baseSalary: u.staffProfile?.baseSalary ? Number(u.staffProfile.baseSalary) : 2500,
        hireDate: u.staffProfile?.hireDate || u.createdAt,
        status: u.status,
        qualificationVerified: u.qualificationVerified,
        liveCameraShot: u.profilePicture || meta.liveCameraShot || null,
        liveCameraCaptured: Boolean(u.profilePicture || meta.liveCameraCaptured),
        cameraCapturedAt: meta.cameraCapturedAt || u.createdAt,
        gpsAddress: u.gpsAddress,
        gpsLatitude: u.gpsLatitude,
        gpsLongitude: u.gpsLongitude,
        branchName: u.branch?.name || 'Main Branch',
        branchCode: u.branch?.code || 'MAIN',
        branchId: u.branchId,
        employedByBranchManagerName: meta.employedByBranchManagerName || meta.branchManagerName || 'Branch Manager',
        ownerApprovedAt: meta.ownerApprovedAt || null,
        ownerApprovedByName: meta.ownerApprovedByName || null,
        branchApprovedAt: meta.branchApprovedAt || u.staffProfile?.createdAt || u.createdAt,
        ownerVerifiedAt: meta.ownerVerifiedAt || null,
        ownerVerifiedByName: meta.ownerVerifiedByName || null,
        isVerifiedByOwner: Boolean(meta.ownerVerifiedAt),
        approvalStage: meta.approvalStage || 'BRANCH_MANAGER_APPROVED',
      };
    });
}

/**
 * Step 4: Company Owner Verifies & Acknowledges Employee Profile Dossier
 */
async function verifyEmployment(ownerUser, targetId, { notes = '' } = {}) {
  const role = String(ownerUser?.role || '').toUpperCase();
  if (!['COMPANY_OWNER', 'BOARD_EXECUTIVE', 'EXECUTIVE_MANAGEMENT'].includes(role)) {
    throw new AuthorizationError('Only Company Owner can verify and sign off branch employee dossiers.');
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [{ id: targetId }, { staffProfile: { id: targetId } }],
      deletedAt: null,
    },
  });

  if (!targetUser) throw new NotFoundError('Target staff record not found');
  const currentMeta = targetUser.metadata || {};
  const ownerName = `${ownerUser.firstName || ''} ${ownerUser.lastName || ''}`.trim() || 'Company Owner';

  const updated = await prisma.user.update({
    where: { id: targetUser.id },
    data: {
      metadata: {
        ...currentMeta,
        ownerVerifiedAt: new Date().toISOString(),
        ownerVerifiedById: ownerUser.id,
        ownerVerifiedByName: ownerName,
        verificationNotes: notes || 'Verified and acknowledged by Company Owner',
      },
    },
    select: { id: true, firstName: true, lastName: true, metadata: true },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: targetUser.tenantId,
      userId: ownerUser.id,
      action: 'APPROVE',
      entityType: 'staff',
      entityId: targetUser.id,
      metadata: {
        subAction: 'STAFF_DOSSIER_VERIFIED_BY_COMPANY_OWNER',
        verifiedBy: ownerName,
        notes,
      },
    },
  }).catch(() => { });

  return {
    success: true,
    message: `Staff dossier for ${targetUser.firstName} ${targetUser.lastName} verified by Company Owner.`,
    user: updated,
    metadata: updated.metadata,
  };
}

async function approveStaffAccount(approverUser, targetId, { approve = true, notes = '' } = {}) {
  const role = String(approverUser?.role || '').toUpperCase();
  if (!['COMPANY_OWNER', 'EXECUTIVE_MANAGEMENT', 'BOARD_EXECUTIVE', 'BRANCH_MANAGER'].includes(role)) {
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

  if (role === 'COMPANY_OWNER' && approve) {
    return ownerApproveStaff(approverUser, targetId, { notes });
  } else if (role === 'BRANCH_MANAGER' && approve) {
    return branchApproveStaff(approverUser, targetId, { notes });
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

  const [rows, total] = await Promise.all([
    prisma.staff.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, email: true, phone: true,
            role: true, status: true, qualificationVerified: true,
            profilePicture: true, metadata: true,
            gpsAddress: true, gpsLatitude: true, gpsLongitude: true, isHidden: true,
            branch: { select: { id: true, name: true, city: true } },
          },
        },
        salaryProfile: { include: { qualificationLevel: true, salaryGrade: true, salaryStep: true, serviceBand: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.staff.count({ where }),
  ]);

  const data = rows.map((row) => ({ ...row, branch: row.user?.branch || null }));

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
          profilePicture: true, metadata: true,
          qualificationVerified: true, isHidden: true,
          branch: { select: { id: true, name: true, city: true } },
        },
      },
      salaryProfile: { include: { qualificationLevel: true, salaryGrade: true, salaryStep: true, serviceBand: true, incrementHistory: true } },
      salaries: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!staff) throw new NotFoundError(`Staff record '${id}'`);
  return { ...staff, branch: staff.user?.branch || null };
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
  ownerApproveStaff,
  branchApproveStaff,
  getBranchApprovedStaff,
  verifyEmployment,
  approveStaffAccount,
  getAll,
  getById,
  update,
  deactivate,
};
