const { prisma } = require('../../../config/database');
const { emitToDeveloper } = require('../../../config/socket');

class SystemLockService {
  async getLockStatus() {
    const state = await prisma.systemLockState.findFirst({ orderBy: { updatedAt: 'desc' } });
    return {
      isLocked: state ? state.isLocked : false,
      maintenanceMode: state ? state.maintenanceMode : false,
      reason: state ? state.lockReason : null,
      lockedAt: state ? state.lockedAt : null,
      lockedBy: state ? state.lockedBy : null,
      allowedPortal: 'DEVELOPER_LANDLORD_ONLY',
    };
  }

  async lockSystem(reason, developerUser) {
    const existing = await prisma.systemLockState.findFirst();
    const lockReason = reason || 'Emergency Developer Maintenance Lockdown';
    const lockedBy = developerUser?.email || developerUser?.id || 'Developer Authority';

    const state = existing
      ? await prisma.systemLockState.update({
          where: { id: existing.id },
          data: { isLocked: true, maintenanceMode: true, lockReason, lockedBy, lockedAt: new Date() },
        })
      : await prisma.systemLockState.create({
          data: { isLocked: true, maintenanceMode: true, lockReason, lockedBy, lockedAt: new Date() },
        });

    await prisma.developerAuditLog.create({
      data: {
        developerUserId: developerUser?.id || null,
        action: 'LOCK_SYSTEM',
        targetComponent: 'SYSTEM_LOCK_STATE',
        details: { lockReason, lockedBy },
      },
    }).catch(() => {});

    emitToDeveloper('system:lock_changed', { isLocked: true, reason: lockReason });
    return state;
  }

  async unlockSystem(developerUser) {
    const existing = await prisma.systemLockState.findFirst();
    const state = existing
      ? await prisma.systemLockState.update({
          where: { id: existing.id },
          data: { isLocked: false, maintenanceMode: false, lockReason: null, lockedAt: null },
        })
      : await prisma.systemLockState.create({
          data: { isLocked: false, maintenanceMode: false, lockReason: null },
        });

    await prisma.developerAuditLog.create({
      data: {
        developerUserId: developerUser?.id || null,
        action: 'UNLOCK_SYSTEM',
        targetComponent: 'SYSTEM_LOCK_STATE',
        details: { unlockedBy: developerUser?.email || 'Developer Authority' },
      },
    }).catch(() => {});

    emitToDeveloper('system:lock_changed', { isLocked: false });
    return state;
  }
}

module.exports = new SystemLockService();
