const { prisma } = require('../config/database');
const logger = require('../utils/logger');
const { NotFoundError } = require('../utils/errors');

async function create(data) {
  const guarantor = await prisma.guarantor.create({
    data: {
      tenantId: data.tenantId || null,
      userId: data.userId,
      ghanaCardNumber: data.ghanaCardNumber,
      relationship: data.relationship,
      agreementSigned: Boolean(data.agreementSigned),
      agreementSignedAt: data.agreementSigned ? new Date() : null,
    },
    include: { user: true },
  });
  logger.info(`Guarantor profile created for User ID: ${data.userId}`);
  return guarantor;
}

async function getAll({ page = 1, limit = 20, tenantId = null }) {
  const skip = (page - 1) * limit;
  const where = tenantId ? { tenantId } : {};
  const [data, total] = await Promise.all([
    prisma.guarantor.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true } },
        loanGuarantors: { include: { loan: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.guarantor.count({ where }),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function getById(id) {
  const guarantor = await prisma.guarantor.findFirst({
    where: { OR: [{ id }, { userId: id }] },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      loanGuarantors: {
        include: {
          loan: {
            include: {
              member: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
              penalties: true,
            },
          },
        },
      },
    },
  });
  if (!guarantor) throw new NotFoundError(`Guarantor '${id}'`);
  return guarantor;
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
