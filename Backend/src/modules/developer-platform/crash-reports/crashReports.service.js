const { prisma } = require('../../../config/database');

class CrashReportsService {
  async getRecentCrashes(limit = 50) {
    const reports = await prisma.aIDiagnosticLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const unhandledExceptions = reports.filter((r) => !r.autoFixed).length;
    return {
      totalCrashes: reports.length,
      unhandledExceptions,
      systemUptimeHours: (process.uptime() / 3600).toFixed(2),
      reports: reports.map((r) => ({
        id: r.id,
        issueType: r.issueType,
        severity: r.severity,
        message: r.description,
        stack: r.stackTrace,
        recommendedFix: r.recommendedFix,
        resolved: r.autoFixed,
        timestamp: r.createdAt,
      })),
    };
  }

  async logCrash(errorContext = {}) {
    const created = await prisma.aIDiagnosticLog.create({
      data: {
        issueType: errorContext.issueType || 'RUNTIME_EXCEPTION',
        severity: errorContext.severity || 'HIGH',
        description: errorContext.message || 'Unhandled application exception captured',
        stackTrace: errorContext.stack || null,
        recommendedFix: errorContext.recommendedFix || 'Inspect controller/service validation and database connectivity.',
        autoFixed: false,
      },
    });
    return created;
  }
}

module.exports = new CrashReportsService();
