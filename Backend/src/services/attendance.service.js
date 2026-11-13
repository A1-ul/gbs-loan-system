class AttendanceService {
  async recordClockIn(staffId, location) {
    return {
      staffId,
      clockInTime: new Date(),
      location,
      status: 'ON_TIME'
    };
  }
}

module.exports = new AttendanceService();
