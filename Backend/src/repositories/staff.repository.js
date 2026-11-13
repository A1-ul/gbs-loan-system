const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class StaffRepository {
  async findById(id) {
    return prisma.staff.findUnique({
      where: { id },
      include: { user: true, salaryProfile: true }
    });
  }

  async findByEmployeeId(employeeId) {
    return prisma.staff.findUnique({
      where: { employeeId },
      include: { user: true, salaryProfile: true }
    });
  }

  async findAll({ skip = 0, take = 50, department, isActive }) {
    const where = {};
    if (department) where.department = department;
    if (typeof isActive === 'boolean') where.isActive = isActive;

    const [total, staff] = await Promise.all([
      prisma.staff.count({ where }),
      prisma.staff.findMany({
        where,
        skip,
        take,
        include: { user: true, salaryProfile: true },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return { total, staff };
  }

  async create(data) {
    return prisma.staff.create({
      data,
      include: { user: true }
    });
  }

  async update(id, data) {
    return prisma.staff.update({
      where: { id },
      data,
      include: { user: true }
    });
  }
}

module.exports = new StaffRepository();
