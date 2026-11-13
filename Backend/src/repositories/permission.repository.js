const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PermissionRepository {
  async getUserRole(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true }
    });
    return user;
  }
}

module.exports = new PermissionRepository();
