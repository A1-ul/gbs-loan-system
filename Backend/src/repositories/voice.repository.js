const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class VoiceRepository {
  async findByUserId(userId) {
    return prisma.voiceProfile.findUnique({
      where: { userId },
      include: { verificationLogs: { orderBy: { createdAt: 'desc' }, take: 10 } }
    });
  }

  async createProfile(data) {
    return prisma.voiceProfile.create({
      data
    });
  }

  async updateProfile(userId, data) {
    return prisma.voiceProfile.update({
      where: { userId },
      data
    });
  }

  async createLog(data) {
    return prisma.voiceVerificationLog.create({
      data
    });
  }
}

module.exports = new VoiceRepository();
