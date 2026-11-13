/**
 * GBS LOAN MANAGEMENT SYSTEM - PROCEDURE 16 FINAL AUDIT CLI
 * Run: node Backend/scripts/verify-final-audit.js
 * Standard: Node.js CommonJS
 */

const finalAuditor = require('../src/modules/developer-platform/services/finalSystemAuditor.service');

async function main() {
  console.log('====================================================');
  console.log('  GBS LOAN MANAGEMENT SYSTEM - PROCEDURE 16 AUDIT');
  console.log('  FINAL FULL SYSTEM AUDIT AGAINST MASTER BLUEPRINT');
  console.log('====================================================');

  try {
    const { target1, report } = await finalAuditor.saveReport();

    console.log(`TOTAL PHASES:            ${report.totalPhases}`);
    console.log(`COMPLETED PHASES:        ${report.completedPhases}`);
    console.log(`TOTAL MODULES:           ${report.totalModules}`);
    console.log(`COMPLETED MODULES:       ${report.completedModules}`);
    console.log(`TOTAL REQUIRED FOLDERS:  ${report.totalRequiredFolders}`);
    console.log(`TOTAL REQUIRED FILES:    ${report.totalRequiredFiles}`);
    console.log(`MISSING COMPONENTS:      ${report.missingComponents}`);
    console.log(`KNOWN ERRORS:            ${report.knownErrors}`);
    console.log(`UNRESOLVED ISSUES:       ${report.unresolvedIssues}`);
    console.log(`TESTS PASSED:            ${report.testsPassed}`);
    console.log(`TESTS FAILED:            ${report.testsFailed}`);
    console.log('----------------------------------------------------');
    console.log(`PRODUCTION READINESS:    ${report.productionReadiness}`);
    console.log('----------------------------------------------------');
    console.log(`Database Connection:     ${report.database.connected ? 'CONNECTED' : 'DISCONNECTED'} (${report.database.usersRegisteredCount} users)`);
    console.log(`Verdict:                 ${report.finalVerdict}`);
    console.log(`Report Saved:            ${target1}`);
    console.log('====================================================');
    console.log(`Status: ${report.productionReadiness === 'READY' ? 'PROCEDURE 16 COMPLETED — SYSTEM IS PRODUCTION READY' : 'SYSTEM NOT READY'}`);
  } catch (err) {
    console.error('Procedure 16 verification failed:', err);
    process.exit(1);
  }
}

main();
