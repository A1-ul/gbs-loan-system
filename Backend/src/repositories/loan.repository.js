const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class LoanRepository {
  async findById(id) {
    return prisma.loan.findUnique({
      where: { id },
      include: {
        member: { include: { user: true } },
        payments: true,
        schedule: true,
        workflowLogs: true,
        loanGuarantors: { include: { guarantor: { include: { user: true } } } },
        penalties: true
      }
    });
  }

  async findByLoanNumber(loanNumber) {
    return prisma.loan.findUnique({
      where: { loanNumber },
      include: { member: { include: { user: true } }, schedule: true }
    });
  }

  async findAll({ skip = 0, take = 50, status, memberId }) {
    const where = {};
    if (status) where.status = status;
    if (memberId) where.memberId = memberId;

    const [total, loans] = await Promise.all([
      prisma.loan.count({ where }),
      prisma.loan.findMany({
        where,
        skip,
        take,
        include: { member: { include: { user: true } } },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { total, loans };
  }

  async create(data) {
    return prisma.loan.create({
      data,
      include: { member: true, schedule: true }
    });
  }

  async updateStatus(id, status, performedBy, notes = '') {
    return prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({ where: { id } });
      const updatedLoan = await tx.loan.update({
        where: { id },
        data: { status }
      });
      await tx.loanWorkflowLog.create({
        data: {
          loanId: id,
          fromStatus: loan.status,
          toStatus: status,
          performedBy,
          notes
        }
      });
      return updatedLoan;
    });
  }

  async update(id, data) {
    return prisma.loan.update({
      where: { id },
      data
    });
  }
}

module.exports = new LoanRepository();
