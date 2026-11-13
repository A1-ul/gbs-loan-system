const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class MemberRepository {
  async findById(id) {
    return prisma.member.findUnique({
      where: { id },
      include: { user: true, loans: true }
    });
  }

  async findByMemberNumber(memberNumber) {
    return prisma.member.findUnique({
      where: { memberNumber },
      include: { user: true }
    });
  }

  async findByUserId(userId) {
    return prisma.member.findUnique({
      where: { userId },
      include: { user: true, loans: true }
    });
  }

  async findAll({ skip = 0, take = 50, search = '' }) {
    const where = search ? {
      OR: [
        { memberNumber: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } }
      ]
    } : {};

    const [total, members] = await Promise.all([
      prisma.member.count({ where }),
      prisma.member.findMany({
        where,
        skip,
        take,
        include: { user: true },
        orderBy: { registrationDate: 'desc' }
      })
    ]);

    return { total, members };
  }

  async create(data) {
    return prisma.member.create({
      data,
      include: { user: true }
    });
  }

  async update(id, data) {
    return prisma.member.update({
      where: { id },
      data,
      include: { user: true }
    });
  }

  async delete(id) {
    return prisma.member.delete({
      where: { id }
    });
  }
}

module.exports = new MemberRepository();
