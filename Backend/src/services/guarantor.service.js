const bcrypt = require('bcryptjs');
const { prisma } = require('../config/database');
const logger = require('../utils/logger');
const { buildPhoneSearchVariants } = require('./gps.service');
const { getRecordProvenance } = require('../config/environments');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errors');

async function create(data) {
  const tenantId = data.tenantId || null;
  let userId = data.userId;

  if (!userId) {
    if (!data.phone && !data.email && !data.name && !data.firstName) {
      throw new ValidationError('Name, phone, or email is required to register a guarantor');
    }

    const email = data.email || `guarantor_${Date.now()}@gbsloan.com`;
    let phone = String(data.phone || `+233${Math.floor(200000000 + Math.random() * 799999999)}`).trim();
    if (!phone.startsWith('+')) {
      phone = phone.startsWith('0') ? `+233${phone.slice(1)}` : `+233${phone}`;
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });

    if (existingUser) {
      userId = existingUser.id;
      await prisma.user.update({
        where: { id: userId },
        data: {
          ...(data.gpsAddress ? { gpsAddress: data.gpsAddress } : {}),
          ...(data.address ? { address: data.address } : {}),
          ...(data.gpsLatitude != null ? { gpsLatitude: Number(data.gpsLatitude) } : {}),
          ...(data.gpsLongitude != null ? { gpsLongitude: Number(data.gpsLongitude) } : {}),
        },
      }).catch(() => {});
    } else {
      const nameParts = String(data.name || `${data.firstName || 'Guarantor'} ${data.lastName || 'User'}`).trim().split(/\s+/);
      const firstName = data.firstName || nameParts[0] || 'Guarantor';
      const lastName = data.lastName || nameParts.slice(1).join(' ') || 'User';
      const passwordHash = await bcrypt.hash(data.password || 'GuarantorPass123!', 10);

      const user = await prisma.user.create({
        data: {
          tenantId,
          email,
          phone,
          passwordHash,
          firstName,
          lastName,
          role: 'GUARANTOR_PORTAL',
          status: 'ACTIVE',
          address: data.address || null,
          gpsAddress: data.gpsAddress || null,
          gpsLatitude: data.gpsLatitude != null ? Number(data.gpsLatitude) : null,
          gpsLongitude: data.gpsLongitude != null ? Number(data.gpsLongitude) : null,
          isHidden: Boolean(data.isHidden),
          ...getRecordProvenance(),
        },
      });
      userId = user.id;
    }
  }

  const existingGuarantor = await prisma.guarantor.findUnique({ where: { userId } });
  if (existingGuarantor) {
    throw new ConflictError('This user is already registered as a guarantor');
  }

  const guarantor = await prisma.guarantor.create({
    data: {
      tenantId,
      userId,
      ghanaCardNumber: data.ghanaCardNumber ? String(data.ghanaCardNumber).trim().toUpperCase() : null,
      relationship: data.relationship || 'Family / Business Surety',
      gpsAddress: data.gpsAddress || null,
      gpsLatitude: data.gpsLatitude != null ? Number(data.gpsLatitude) : null,
      gpsLongitude: data.gpsLongitude != null ? Number(data.gpsLongitude) : null,
      isHidden: Boolean(data.isHidden),
      agreementSigned: Boolean(data.agreementSigned),
      agreementSignedAt: data.agreementSigned ? new Date() : null,
    },
    include: {
      user: {
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true,
          address: true, gpsAddress: true, gpsLatitude: true, gpsLongitude: true, isHidden: true, status: true,
        },
      },
    },
  });
  logger.info(`Guarantor profile created for User ID: ${userId}`);
  return guarantor;
}

async function getAll({ page = 1, limit = 20, search = '', includeHidden = false, tenantId = null } = {}) {
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
      { ghanaCardNumber: { contains: q, mode: 'insensitive' } },
      { relationship: { contains: q, mode: 'insensitive' } },
      { gpsAddress: { contains: q, mode: 'insensitive' } },
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

  const where = andConditions.length > 0 ? { AND: andConditions } : {};
  const [rows, total] = await Promise.all([
    prisma.guarantor.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true, firstName: true, lastName: true, email: true, phone: true,
            address: true, gpsAddress: true, gpsLatitude: true, gpsLongitude: true, isHidden: true, status: true,
          },
        },
        loanGuarantors: { include: { loan: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.guarantor.count({ where }),
  ]);

  const data = rows.map((g) => ({
    ...g,
    gpsAddress: g.gpsAddress || g.user?.gpsAddress || '',
    gpsLatitude: g.gpsLatitude ?? g.user?.gpsLatitude ?? null,
    gpsLongitude: g.gpsLongitude ?? g.user?.gpsLongitude ?? null,
    isHidden: Boolean(g.isHidden || g.user?.isHidden),
  }));

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getById(id) {
  const guarantor = await prisma.guarantor.findFirst({
    where: { OR: [{ id }, { userId: id }] },
    include: {
      user: {
        select: {
          id: true, firstName: true, lastName: true, email: true, phone: true,
          address: true, gpsAddress: true, gpsLatitude: true, gpsLongitude: true, isHidden: true,
        },
      },
      loanGuarantors: {
        include: {
          loan: {
            include: {
              member: { include: { user: { select: { firstName: true, lastName: true, phone: true, gpsAddress: true } } } },
              penalties: true,
            },
          },
        },
      },
    },
  });
  if (!guarantor) throw new NotFoundError(`Guarantor '${id}'`);
  return {
    ...guarantor,
    gpsAddress: guarantor.gpsAddress || guarantor.user?.gpsAddress || '',
    gpsLatitude: guarantor.gpsLatitude ?? guarantor.user?.gpsLatitude ?? null,
    gpsLongitude: guarantor.gpsLongitude ?? guarantor.user?.gpsLongitude ?? null,
    isHidden: Boolean(guarantor.isHidden || guarantor.user?.isHidden),
  };
}

async function update(id, data) {
  return prisma.guarantor.update({
    where: { id },
    data,
    include: { user: true },
  });
}

async function getLoans(id) {
  const guarantor = await getById(id);
  return guarantor.loanGuarantors.map((lg) => ({
    linkId: lg.id,
    guaranteedAt: lg.createdAt,
    loan: lg.loan,
  }));
}

async function signAgreement(id) {
  const guarantor = await getById(id);
  return prisma.guarantor.update({
    where: { id: guarantor.id },
    data: {
      agreementSigned: true,
      agreementSignedAt: new Date(),
    },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });
}

async function togglePenaltyNotifications(id, enabled) {
  const guarantor = await getById(id);
  return prisma.guarantor.update({
    where: { id: guarantor.id },
    data: { penaltyNotifyEnabled: Boolean(enabled) },
  });
}

module.exports = {
  create,
  getAll,
  getById,
  update,
  getLoans,
  signAgreement,
  togglePenaltyNotifications,
};
