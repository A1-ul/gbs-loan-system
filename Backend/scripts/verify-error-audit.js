/**
 * GBS LOAN MANAGEMENT SYSTEM - PROCEDURE 14 ERROR AUDIT CLI
 * Run: node Backend/scripts/verify-error-audit.js
 * Standard: Node.js CommonJS
 */

const errorAudit = require('../src/modules/developer-platform/services/errorAudit.service');

function main() {
  console.log('====================================================');
  console.log('  GBS LOAN MANAGEMENT SYSTEM - PROCEDURE 14 AUDIT');
  console.log('  DO NOT SKIP ERRORS VERIFICATION');
  console.log('====================================================');

  try {
    const { target1, report } = errorAudit.saveReport();

    console.log(`Total Errors Tracked:      ${report.totalErrorsTracked}`);
    console.log(`Resolved Errors:           ${report.resolvedErrors} / ${report.totalErrorsTracked}`);
    console.log(`Remaining Unresolved:      ${report.remainingErrors}`);
    console.log('----------------------------------------------------');
    report.errorHistory.forEach((e) => {
      console.log(`  [✓] ${e.id}: ${e.description}`);
      console.log(`      Root Cause: ${e.rootCause}`);
      console.log(`      Fix:        ${e.fix}`);
      console.log(`      Status:     ${e.status}`);
    });
    console.log('----------------------------------------------------');
    console.log(`Verdict:                   ${report.verdict}`);
    console.log(`Report Saved:              ${target1}`);
    console.log('====================================================');
    console.log(`Status: ${report.status === 'ZERO_ERRORS_REMAINING' ? 'PROCEDURE 14 COMPLETED — ZERO ERRORS REMAINING' : 'ACTION REQUIRED'}`);
  } catch (err) {
    console.error('Procedure 14 verification failed:', err);
    process.exit(1);
  }
}

main();
