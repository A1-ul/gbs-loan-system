const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');
const logger = require('../utils/logger');
const { getRecordProvenance } = require('../config/environments');
const { buildPhoneSearchVariants } = require('./gps.service');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errors');

/**
 * Register & Onboard a new Member
 */
async function create(data) {
  let userId = data.userId;
  const tenantId = data.tenantId || null;

  // 1. If userId is not provided, create or find User record
  if (!userId) {
    if (!data.email && !data.phone && !data.name) {
      throw new ValidationError('Name, email, or phone is required to create a member');
    }

    const email = data.email || `member_${Date.now()}@gbsloan.com`;
    let phone = data.phone || `+233${Math.floor(200000000 + Math.random() * 800000000)}`;
    if (!phone.startsWith('+')) {
      phone = phone.startsWith('0') ? `+233${phone.slice(1)}` : `+233${phone}`;
    }

    // Check if user already exists
    let existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phone }],
      },
    });

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const nameParts = (data.name || `${data.firstName || 'Member'} ${data.lastName || 'User'}`).trim().split(' ');
      const firstName = nameParts[0] || 'Member';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      const passwordHash = await bcrypt.hash(data.password || 'MemberPass123!', 10);
      const newUser = await prisma.user.create({
        data: {
          email,
          phone,
          passwordHash,
          firstName,
          lastName,
          role: 'MEMBER_PORTAL',
          status: 'ACTIVE',
          tenantId,
          address: data.address || null,
          gpsAddress: data.gpsAddress || null,
          gpsLatitude: data.gpsLatitude != null ? Number(data.gpsLatitude) : null,
          gpsLongitude: data.gpsLongitude != null ? Number(data.gpsLongitude) : null,
          isHidden: Boolean(data.isHidden),
          ...getRecordProvenance(),
        },
      });
      userId = newUser.id;
    }
  }

  if (userId && (data.gpsAddress || data.address || data.gpsLatitude != null)) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.address ? { address: data.address } : {}),
        ...(data.gpsAddress ? { gpsAddress: data.gpsAddress } : {}),
        ...(data.gpsLatitude != null ? { gpsLatitude: Number(data.gpsLatitude) } : {}),
        ...(data.gpsLongitude != null ? { gpsLongitude: Number(data.gpsLongitude) } : {}),
        ...(data.isHidden !== undefined ? { isHidden: Boolean(data.isHidden) } : {}),
      },
    }).catch(() => {});
  }

  // 2. Check if this user is already a member
  const existingMember = await prisma.member.findUnique({
    where: { userId },
  });

  if (existingMember) {
    throw new ConflictError('This user is already registered as a member');
  }

  // 3. Normalize Ghana Card Number
  let ghanaCard = data.ghanaCardNumber || data.idNum || null;
  let isCardVerified = false;
  if (ghanaCard) {
    ghanaCard = ghanaCard.trim().toUpperCase();
    const ghanaCardRegex = /^GHA-\d{9}-\d$/;
    if (ghanaCardRegex.test(ghanaCard)) {
      isCardVerified = true;
    }
  }

  // 4. Generate unique Member Number MBR-YYYY-XXXXX
  const currentYear = new Date().getFullYear();
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const memberNumber = data.memberNumber || `MBR-${currentYear}-${randomSuffix}`;

  const member = await prisma.member.create({
    data: {
      userId,
      tenantId,
      memberNumber,
      ghanaCardNumber: ghanaCard,
      ghanaCardVerified: isCardVerified,
      ghanaCardVerifiedAt: isCardVerified ? new Date() : null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      occupation: data.occupation || 'Self Employed',
      employer: data.employer || 'Independent',
      monthlyIncome: data.monthlyIncome ? parseFloat(data.monthlyIncome) : null,
      emergencyContact: data.emergencyContact || 'Family Member',
      emergencyPhone: data.emergencyPhone || null,
      gpsAddress: data.gpsAddress || null,
      gpsLatitude: data.gpsLatitude != null ? Number(data.gpsLatitude) : null,
      gpsLongitude: data.gpsLongitude != null ? Number(data.gpsLongitude) : null,
      isHidden: Boolean(data.isHidden),
      ...getRecordProvenance(),
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          address: true,
          gpsAddress: true,
          gpsLatitude: true,
          gpsLongitude: true,
          isHidden: true,
          role: true,
          status: true,
        },
      },
      loans: true,
    },
  });

  logger.info(`Member registered successfully: ${member.memberNumber} (${member.user.firstName} ${member.user.lastName})`);
  return member;
}

/**
 * Fetch all members with pagination, search, active loans count, and payment counts
 */
async function getAll({ page = 1, limit = 50, search, status, tenantId, includeHidden = false } = {}) {
  const skip = (page - 1) * limit;
  const andConditions = [];
  if (tenantId) andConditions.push({ tenantId });

  const hasSearch = Boolean(search && String(search).trim());
  if (!hasSearch && !includeHidden) {
    andConditions.push({ isHidden: false });
    andConditions.push({ user: { isHidden: false } });
  }

  if (hasSearch) {
    const q = String(search).trim();
    const tokens = q.split(/\s+/).filter(Boolean);
    const phoneVariants = buildPhoneSearchVariants(q);

    const searchOr = [
      { memberNumber: { contains: q, mode: 'insensitive' } },
      { ghanaCardNumber: { contains: q, mode: 'insensitive' } },
      { gpsAddress: { contains: q, mode: 'insensitive' } },
      { occupation: { contains: q, mode: 'insensitive' } },
      { employer: { contains: q, mode: 'insensitive' } },
      { user: { firstName: { contains: q, mode: 'insensitive' } } },
      { user: { lastName: { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
      { user: { gpsAddress: { contains: q, mode: 'insensitive' } } },
      { user: { address: { contains: q, mode: 'insensitive' } } },
      ...phoneVariants.map((pv) => ({ user: { phone: { contains: pv, mode: 'insensitive' } } })),
    ];

    if (tokens.length > 1) {
      searchOr.push({
        AND: tokens.map((tok) => ({
          OR: [
            { user: { firstName: { contains: tok, mode: 'insensitive' } } },
            { user: { lastName: { contains: tok, mode: 'insensitive' } } },
          ],
        })),
      });
    }

    andConditions.push({ OR: searchOr });
  }

  if (status) {
    andConditions.push({ user: { status } });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            gpsAddress: true,
            gpsLatitude: true,
            gpsLongitude: true,
            isHidden: true,
            role: true,
            status: true,
          },
        },
        loans: {
          include: {
            payments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.member.count({ where }),
  ]);

  // Enrich with live payments count and active loans summary
  const data = members.map((m) => {
    const totalPaymentsCount = m.loans.reduce((acc, loan) => acc + (loan.payments ? loan.payments.length : 0), 0);
    const activeLoans = m.loans.filter((l) => ['APPROVED', 'DISBURSED', 'ONGOING'].includes(l.status));
    const resolvedGpsAddress = m.gpsAddress || m.user.gpsAddress || '';
    const resolvedLat = m.gpsLatitude ?? m.user.gpsLatitude ?? null;
    const resolvedLng = m.gpsLongitude ?? m.user.gpsLongitude ?? null;
    return {
      id: m.id,
      memberNumber: m.memberNumber,
      userId: m.userId,
      name: `${m.user.firstName} ${m.user.lastName}`,
      email: m.user.email,
      phone: m.user.phone,
      status: m.user.status,
      idType: 'Ghana Card',
      idNum: m.ghanaCardNumber || 'N/A',
      ghanaCardVerified: m.ghanaCardVerified,
      paymentsCount: totalPaymentsCount,
      activeLoansCount: activeLoans.length,
      gpsAddress: resolvedGpsAddress,
      gpsLatitude: resolvedLat,
      gpsLongitude: resolvedLng,
      isHidden: Boolean(m.isHidden || m.user.isHidden),
      address: m.user.address || resolvedGpsAddress || (m.occupation ? `${m.occupation} at ${m.employer}` : 'Ghana'),
      occupation: m.occupation,
      employer: m.employer,
      monthlyIncome: m.monthlyIncome,
      registrationDate: m.registrationDate,
      user: m.user,
      loans: m.loans,
    };
  });

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Fetch member by Member ID (optionally scoped by tenantId)
 */
async function getById(id, tenantId = null) {
  const where = {
    OR: [{ id }, { memberNumber: id }],
  };
  if (tenantId) where.tenantId = tenantId;

  const member = await prisma.member.findFirst({
    where,
    include: {
      user: {
        select: {
          id: true,
          tenantId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          profilePicture: true,
          role: true,
          status: true,
        },
      },
      loans: {
        include: {
          payments: true,
          schedule: true,
        },
      },
    },
  });

  if (!member) {
    throw new NotFoundError(`Member '${id}'`);
  }

  return member;
}

/**
 * Fetch member by authenticated User ID
 */
async function getByUserId(userId) {
  const member = await prisma.member.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          role: true,
          status: true,
        },
      },
      loans: {
        include: {
          payments: true,
          schedule: true,
        },
      },
    },
  });

  if (!member) {
    throw new NotFoundError(`Member profile for user '${userId}'`);
  }

  return member;
}

/**
 * Update member profile
 */
async function update(id, data) {
  const member = await getById(id);

  // If name, phone, or GPS address needs updating on user table
  if (data.name || data.firstName || data.lastName || data.phone || data.gpsAddress !== undefined || data.address !== undefined || data.isHidden !== undefined) {
    const nameParts = (data.name || '').trim().split(' ');
    await prisma.user.update({
      where: { id: member.userId },
      data: {
        firstName: nameParts[0] || data.firstName || undefined,
        lastName: nameParts.slice(1).join(' ') || data.lastName || undefined,
        phone: data.phone || undefined,
        address: data.address !== undefined ? data.address : undefined,
        gpsAddress: data.gpsAddress !== undefined ? data.gpsAddress : undefined,
        gpsLatitude: data.gpsLatitude != null ? Number(data.gpsLatitude) : undefined,
        gpsLongitude: data.gpsLongitude != null ? Number(data.gpsLongitude) : undefined,
        isHidden: data.isHidden !== undefined ? Boolean(data.isHidden) : undefined,
      },
    });
  }

  return await prisma.member.update({
    where: { id: member.id },
    data: {
      occupation: data.occupation,
      employer: data.employer,
      monthlyIncome: data.monthlyIncome ? parseFloat(data.monthlyIncome) : undefined,
      emergencyContact: data.emergencyContact,
      emergencyPhone: data.emergencyPhone,
      gpsAddress: data.gpsAddress !== undefined ? data.gpsAddress : undefined,
      gpsLatitude: data.gpsLatitude != null ? Number(data.gpsLatitude) : undefined,
      gpsLongitude: data.gpsLongitude != null ? Number(data.gpsLongitude) : undefined,
      isHidden: data.isHidden !== undefined ? Boolean(data.isHidden) : undefined,
      ghanaCardNumber: data.ghanaCardNumber ? data.ghanaCardNumber.trim().toUpperCase() : undefined,
    },
    include: { user: true },
  });
}

/**
 * Statistical summary of members
 */
async function getStats(tenantId = null) {
  const memberWhere = tenantId ? { tenantId } : {};
  const totalMembers = await prisma.member.count({ where: memberWhere });
  const verifiedGhanaCard = await prisma.member.count({ where: { ...memberWhere, ghanaCardVerified: true } });
  const activeMembers = await prisma.user.count({
    where: {
      ...(tenantId ? { tenantId } : {}),
      role: { in: ['MEMBER', 'MEMBER_PORTAL'] },
      status: 'ACTIVE',
    },
  });

  return {
    totalMembers,
    activeMembers,
    verifiedGhanaCard,
    unverifiedGhanaCard: totalMembers - verifiedGhanaCard,
  };
}

/**
 * Verify Ghana Card / National ID
 */
async function verifyGhanaCard(id, ghanaCardNumber) {
  const member = await getById(id);
  const cardToVerify = (ghanaCardNumber || member.ghanaCardNumber || '').trim().toUpperCase();

  const ghanaCardRegex = /^GHA-\d{9}-\d$/;
  if (!ghanaCardRegex.test(cardToVerify)) {
    throw new ValidationError(`Invalid Ghana Card format: ${cardToVerify}. Must match GHA-XXXXXXXXX-X`);
  }

  return await prisma.member.update({
    where: { id: member.id },
    data: {
      ghanaCardNumber: cardToVerify,
      ghanaCardVerified: true,
      ghanaCardVerifiedAt: new Date(),
    },
    include: { user: true },
  });
}

/**
 * Upload Profile Picture for a Member
 */
async function uploadProfilePicture(id, file, tenantId = null) {
  if (!file) {
    throw new ValidationError('Profile picture image file is required');
  }
  const member = await getById(id, tenantId);
  const pictureUrl = `/uploads/${file.filename}`;

  await prisma.user.update({
    where: { id: member.userId },
    data: { profilePicture: pictureUrl },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: member.tenantId || tenantId,
      userId: member.userId,
      action: 'UPDATE',
      entityType: 'MEMBER',
      entityId: member.id,
      newValues: { profilePicture: pictureUrl },
      ...getRecordProvenance(),
    },
  }).catch((err) => logger.warn(`Audit log skipped for picture upload: ${err.message}`));

  return {
    memberId: member.id,
    memberNumber: member.memberNumber,
    profilePicture: pictureUrl,
  };
}

/**
 * Request Member Deletion (Flags record for Manager Approval)
 */
async function requestMemberDeletion(id, reason = 'Account closure requested', requestedById = null, tenantId = null) {
  const member = await getById(id, tenantId);
  const statusBefore = member.user?.status || 'ACTIVE';

  await prisma.user.update({
    where: { id: member.userId },
    data: {
      status: 'PENDING_VERIFICATION',
      deletionRequested: true,
      deletionReason: reason,
    },
  });

  const approvalReq = await prisma.deletionApprovalRequest.create({
    data: {
      tenantId: member.tenantId || tenantId,
      entityType: 'MEMBER',
      entityId: member.id,
      entityLabel: `${member.user?.firstName || ''} ${member.user?.lastName || ''} (${member.memberNumber})`.trim(),
      reason,
      requestedById: requestedById || member.userId,
      status: 'PENDING_MANAGER_APPROVAL',
    },
  });

  await prisma.userVerificationLog.create({
    data: {
      tenantId: member.tenantId || tenantId,
      userId: member.userId,
      adminId: requestedById || member.userId,
      statusBefore,
      statusAfter: 'PENDING_VERIFICATION',
      isQualified: false,
      notes: `Deletion requested: ${reason}`,
    },
  }).catch((err) => logger.warn(`Could not write userVerificationLog: ${err.message}`));

  await prisma.auditLog.create({
    data: {
      tenantId: member.tenantId || tenantId,
      userId: requestedById || member.userId,
      action: 'DELETION_REQUESTED',
      entityType: 'MEMBER',
      entityId: member.id,
      metadata: { reason, deletionRequestId: approvalReq.id },
      ...getRecordProvenance(),
    },
  }).catch((err) => logger.warn(`Could not write auditLog: ${err.message}`));

  logger.warn(`Member deletion requested: ${member.memberNumber} (${reason})`);
  return {
    success: true,
    message: `Deletion request for member ${member.memberNumber} sent to Manager for approval.`,
    data: { id: member.id, requestId: approvalReq.id, status: 'PENDING_MANAGER_APPROVAL' },
  };
}

/**
 * Manager Approves Deletion (Permanent Removal)
 */
async function approveMemberDeletion(id, managerId = 'MANAGER', tenantId = null) {
  const member = await getById(id, tenantId);

  await prisma.deletionApprovalRequest.updateMany({
    where: { entityType: 'MEMBER', entityId: member.id, status: 'PENDING_MANAGER_APPROVAL' },
    data: {
      status: 'APPROVED',
      reviewedById: managerId !== 'MANAGER' ? managerId : null,
      reviewedAt: new Date(),
      reviewNotes: 'Approved by Manager',
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: member.tenantId || tenantId,
      userId: managerId !== 'MANAGER' ? managerId : null,
      action: 'DELETION_APPROVED',
      entityType: 'MEMBER',
      entityId: member.id,
      metadata: { memberNumber: member.memberNumber, deletedUserId: member.userId },
      ...getRecordProvenance(),
    },
  }).catch((err) => logger.warn(`Could not write auditLog: ${err.message}`));

  await prisma.user.delete({
    where: { id: member.userId },
  });

  logger.warn(`Member ${member.memberNumber} permanently deleted by manager ${managerId}`);
  return {
    success: true,
    message: `Manager APPROVED deletion of member ${member.memberNumber}. Record permanently removed.`,
  };
}

/**
 * Manager Rejects Deletion (Restores to Active)
 */
async function rejectMemberDeletion(id, managerId = null, tenantId = null) {
  const member = await getById(id, tenantId);

  await prisma.user.update({
    where: { id: member.userId },
    data: {
      status: 'ACTIVE',
      deletionRequested: false,
      deletionReason: null,
    },
  });

  await prisma.deletionApprovalRequest.updateMany({
    where: { entityType: 'MEMBER', entityId: member.id, status: 'PENDING_MANAGER_APPROVAL' },
    data: {
      status: 'REJECTED',
      reviewedById: managerId || null,
      reviewedAt: new Date(),
      reviewNotes: 'Rejected by Manager; account restored to ACTIVE',
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: member.tenantId || tenantId,
      userId: managerId || null,
      action: 'REJECT',
      entityType: 'MEMBER',
      entityId: member.id,
      metadata: { memberNumber: member.memberNumber, status: 'RESTORED_ACTIVE' },
      ...getRecordProvenance(),
    },
  }).catch((err) => logger.warn(`Could not write auditLog: ${err.message}`));

  logger.info(`Member deletion rejected for ${member.memberNumber}. Restored to ACTIVE.`);
  return {
    success: true,
    message: `Manager REJECTED deletion of member ${member.memberNumber}. Record restored to Active.`,
  };
}

module.exports = {
  create,
  getAll,
  getById,
  getByUserId,
  update,
  getStats,
  verifyGhanaCard,
  uploadProfilePicture,
  requestMemberDeletion,
  approveMemberDeletion,
  rejectMemberDeletion,
};
