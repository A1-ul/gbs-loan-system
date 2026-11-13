const { prisma } = require('../config/database');
const { NotFoundError, ValidationError } = require('../utils/errors');

class AttendanceService {
  async resolveStaffRecord(userId) {
    const staff = await prisma.staff.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true, phone: true } },
      },
    });
    if (staff) return staff;

    // Auto-create Staff profile if authenticated user holds a staff/management role without one
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    const count = await prisma.staff.count();
    const employeeId = `EMP-${String(count + 1).padStart(4, '0')}-${String(Math.floor(10 + Math.random() * 89))}`;
    return prisma.staff.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId || null,
        branchId: user.branchId || null,
        employeeId,
        department: user.role || 'OPERATIONS',
        position: user.role || 'STAFF',
        baseSalary: 0,
        hireDate: new Date(),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true, phone: true } },
      },
    });
  }

  getWorkDateString(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  async recordClockIn(userId, { gpsAddress = null, latitude = null, longitude = null, notes = null } = {}) {
    const staff = await this.resolveStaffRecord(userId);
    const now = new Date();
    const workDate = this.getWorkDateString(now);

    const openShift = await prisma.staffAttendance.findFirst({
      where: { userId, workDate, clockOutAt: null },
      orderBy: { clockInAt: 'desc' },
    });

    if (openShift) {
      return { alreadyClockedIn: true, status: openShift.status, record: { ...openShift, shiftDate: openShift.workDate, staff } };
    }

    const hour = now.getHours();
    const status = hour >= 9 ? 'LATE' : 'CLOCKED_IN';

    const record = await prisma.staffAttendance.create({
      data: {
        tenantId: staff.tenantId || null,
        staffId: staff.id,
        userId,
        workDate,
        clockInAt: now,
        clockInGpsAddress: gpsAddress || null,
        clockInLatitude: latitude != null ? Number(latitude) : null,
        clockInLongitude: longitude != null ? Number(longitude) : null,
        status,
        notes: notes || null,
      },
    });

    if (latitude != null && longitude != null) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          gpsLatitude: Number(latitude),
          gpsLongitude: Number(longitude),
          ...(gpsAddress ? { gpsAddress } : {}),
        },
      }).catch(() => {});
    }

    return {
      alreadyClockedIn: false,
      status: record.status,
      record: { ...record, shiftDate: record.workDate, staff },
    };
  }

  async recordClockOut(userId, { gpsAddress = null, latitude = null, longitude = null, notes = null } = {}) {
    const now = new Date();
    const openShift = await prisma.staffAttendance.findFirst({
      where: { userId, clockOutAt: null },
      orderBy: { clockInAt: 'desc' },
    });

    if (!openShift) {
      throw new ValidationError('No active clock-in shift found. Please clock in first before clocking out.');
    }

    const durationMinutes = Math.max(1, Math.round((now.getTime() - new Date(openShift.clockInAt).getTime()) / 60000));
    const combinedNotes = [openShift.notes, notes].filter(Boolean).join(' | ') || null;

    const updated = await prisma.staffAttendance.update({
      where: { id: openShift.id },
      data: {
        clockOutAt: now,
        clockOutGpsAddress: gpsAddress || null,
        clockOutLatitude: latitude != null ? Number(latitude) : null,
        clockOutLongitude: longitude != null ? Number(longitude) : null,
        durationMinutes,
        status: 'CLOCKED_OUT',
        notes: combinedNotes,
      },
    });

    const staff = await prisma.staff.findUnique({
      where: { userId },
      include: { user: { select: { firstName: true, lastName: true, role: true, phone: true } } },
    }).catch(() => null);

    return { ...updated, shiftDate: updated.workDate, staff };
  }

  async getMyTodayStatus(userId) {
    const workDate = this.getWorkDateString();
    const [todayRecords, recentHistory] = await Promise.all([
      prisma.staffAttendance.findMany({
        where: { userId, workDate },
        orderBy: { clockInAt: 'desc' },
      }),
      prisma.staffAttendance.findMany({
        where: { userId },
        orderBy: { clockInAt: 'desc' },
        take: 14,
      }),
    ]);

    const activeShift = todayRecords.find((r) => !r.clockOutAt) || null;
    const latestRecord = activeShift || todayRecords[0] || null;
    const isClockedIn = Boolean(activeShift);
    return {
      shiftDate: workDate,
      workDate,
      clockedIn: isClockedIn,
      isClockedIn,
      status: latestRecord?.status || 'NOT_CLOCKED_IN',
      todayRecord: latestRecord ? { ...latestRecord, shiftDate: latestRecord.workDate } : null,
      activeShift: activeShift ? { ...activeShift, shiftDate: activeShift.workDate } : null,
      todayRecords: todayRecords.map((r) => ({ ...r, shiftDate: r.workDate })),
      recentHistory: recentHistory.map((r) => ({ ...r, shiftDate: r.workDate })),
    };
  }

  async getAttendanceLogs({ tenantId = null, shiftDate = null, limit = 100 } = {}) {
    const where = {};
    if (tenantId) where.tenantId = tenantId;
    if (shiftDate) where.workDate = shiftDate;

    const records = await prisma.staffAttendance.findMany({
      where,
      orderBy: { clockInAt: 'desc' },
      take: Math.min(Number(limit) || 100, 300),
    });

    if (records.length === 0) return [];

    const userIds = [...new Set(records.map((r) => r.userId).filter(Boolean))];
    const [users, staffList] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, phone: true, role: true, gpsAddress: true, branchId: true },
      }),
      prisma.staff.findMany({
        where: { userId: { in: userIds } },
        select: { id: true, userId: true, employeeId: true, department: true, position: true, branchId: true },
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u]));
    const staffMap = new Map(staffList.map((s) => [s.userId, s]));

    return records.map((r) => {
      const user = userMap.get(r.userId) || null;
      const st = staffMap.get(r.userId) || null;
      return {
        ...r,
        shiftDate: r.workDate,
        staff: {
          id: st?.id || r.staffId,
          employeeId: st?.employeeId || 'STAFF',
          department: st?.department || user?.role || 'OPERATIONS',
          position: st?.position || user?.role || 'STAFF',
          user,
        },
      };
    });
  }
}

module.exports = new AttendanceService();
