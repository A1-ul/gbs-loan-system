const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PaymentRepository {
  async findById(id) {
    return prisma.payment.findUnique({
      where: { id },
      include: { loan: { include: { member: { include: { user: true } } } } }
    });
  }

  async findByRef(paymentRef) {
    return prisma.payment.findUnique({
      where: { paymentRef },
      include: { loan: true }
    });
  }

  async findAll({ skip = 0, take = 50, loanId, status, method }) {
    const where = {};
    if (loanId) where.loanId = loanId;
    if (status) where.status = status;
    if (method) where.method = method;

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take,
        include: { loan: { include: { member: { include: { user: true } } } } },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { total, payments };
  }

  async create(data) {
    return prisma.payment.create({
      data,
      include: { loan: true }
    });
  }

  async updateStatus(id, status, notes = '') {
    return prisma.payment.update({
      where: { id },
      data: { status, notes }
    });
  }
}

module.exports = new PaymentRepository();
