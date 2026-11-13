const fs = require('fs');
const path = require('path');
const { prisma, checkDatabaseHealth } = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * AI Crash & Error Analysis + Persistence into AIDiagnosticLog
 */
async function analyzeErrorLog(errorMessage, stackTrace = null) {
  logger.info('AI Developer Assistant: Analyzing error log...');

  let issueType = 'RUNTIME_EXCEPTION';
  let severity = 'MEDIUM';
  let diagnosis = 'Runtime exception captured by diagnostics engine.';
  let recommendedFix = 'Inspect request payload, validation schema, and call stack.';

  const msg = String(errorMessage || '');
  if (msg.includes('PrismaClientKnownRequestError') || msg.includes('P2002')) {
    issueType = 'DATABASE_CONSTRAINT';
    diagnosis = 'Unique constraint violation detected on database field.';
    recommendedFix = 'Ensure unique identifiers (email, phone, loanNumber, memberNumber) are checked before insert.';
  } else if (msg.includes('P2003') || msg.includes('Foreign key')) {
    issueType = 'FOREIGN_KEY_VIOLATION';
    severity = 'HIGH';
    diagnosis = 'Missing or invalid foreign key reference during relational mutation.';
    recommendedFix = 'Validate parent tenant/user/member existence before inserting child records.';
  } else if (msg.includes('jwt expired') || msg.includes('JsonWebTokenError') || msg.includes('AuthenticationError')) {
    issueType = 'AUTH_TOKEN_FAILURE';
    severity = 'LOW';
    diagnosis = 'JWT token invalid, expired, or wrong secret scope (tenant vs developer).';
    recommendedFix = 'Re-authenticate or ensure Developer tokens only hit /api/v1/developer/*.';
  } else if (msg.includes('Cannot find module') || msg.includes('MODULE_NOT_FOUND')) {
    issueType = 'MODULE_RESOLUTION_ERROR';
    severity = 'CRITICAL';
    diagnosis = 'Missing CommonJS module or invalid relative require() path.';
    recommendedFix = 'Verify exact file location and ensure npm dependencies are installed.';
  }

  const diagnosticRecord = await prisma.aIDiagnosticLog.create({
    data: {
      issueType,
      severity,
      description: msg.slice(0, 1000),
      stackTrace: stackTrace ? String(stackTrace).slice(0, 4000) : null,
      recommendedFix,
      autoFixed: false,
    },
  });

  return {
    logId: diagnosticRecord.id,
    issueType,
    severity,
    diagnosis,
    recommendedFix,
    timestamp: diagnosticRecord.createdAt,
  };
}

/**
 * Scan Project Structure + Detect Zero-Byte Files or Missing Required Pillars
 */
async function verifyBlueprintStructure(rootDir) {
  const targetDir = rootDir || path.join(__dirname, '../../../');

  const requiredDirs = [
    'src/config',
    'src/middleware',
    'src/routes',
    'src/controllers',
    'src/services',
    'src/repositories',
    'src/modules/tenant',
    'src/modules/voice-auth',
    'src/modules/facial-recognition',
    'src/modules/human-resources',
    'src/modules/developer-platform',
    'src/modules/ai-developer',
    'src/modules/migration',
    'src/modules/enterprise',
  ];

  const missingDirectories = [];
  for (const dir of requiredDirs) {
    if (!fs.existsSync(path.join(targetDir, dir))) {
      missingDirectories.push(dir);
    }
  }

  // Real zero-byte file scan across src/
  const zeroByteFiles = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (fs.statSync(full).size === 0) zeroByteFiles.push(path.relative(targetDir, full));
    }
  };
  walk(path.join(targetDir, 'src'));

  return {
    valid: missingDirectories.length === 0 && zeroByteFiles.length === 0,
    missingDirectories,
    zeroByteFiles,
    inspectedCount: requiredDirs.length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Real Automated Diagnostic & Architecture Health Report
 */
async function generateArchitectureReport() {
  const [structure, dbHealth, openDiagnostics, openSecurityAlerts, recentDiagnostics] = await Promise.all([
    verifyBlueprintStructure(),
    checkDatabaseHealth(),
    prisma.aIDiagnosticLog.count({ where: { autoFixed: false } }).catch(() => 0),
    prisma.securityAlert.count({ where: { resolved: false } }).catch(() => 0),
    prisma.aIDiagnosticLog.findMany({ take: 15, orderBy: { createdAt: 'desc' } }),
  ]);

  return {
    architectureVersion: '2.0.0 Enterprise CommonJS Monolith',
    blueprintCompliant: Boolean(structure.valid && dbHealth.connected),
    databaseConnected: dbHealth.connected,
    openDiagnostics,
    openSecurityAlerts,
    securityScanStatus: openSecurityAlerts === 0 ? 'PASSED' : 'ATTENTION_REQUIRED',
    structure,
    recentDiagnostics,
  };
}

module.exports = {
  analyzeErrorLog,
  verifyBlueprintStructure,
  generateArchitectureReport,
};
