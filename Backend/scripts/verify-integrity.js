/**
 * GBS LOAN MANAGEMENT SYSTEM - PROCEDURE 13 INTEGRITY AUDIT CLI
 * Run: node Backend/scripts/verify-integrity.js
 * Standard: Node.js CommonJS
 */

const integrityChecker = require('../src/modules/developer-platform/services/integrityChecker.service');

async function main() {
  console.log('====================================================');
  console.log('  GBS LOAN MANAGEMENT SYSTEM - PROCEDURE 13 AUDIT');
  console.log('  NEVER FALSELY REPORT COMPLETION');
  console.log('====================================================');

  try {
    const { target1, report } = await integrityChecker.saveReport();

    console.log(`Total Subsystems Checked:  ${report.totalChecks}`);
    console.log(`Passed Checks:             ${report.passedChecks} / ${report.totalChecks}`);
    console.log(`Incomplete Checks:         ${report.incompleteCount}`);
    console.log('----------------------------------------------------');
    report.results.forEach((r) => {
      console.log(`  [${r.status === 'VERIFIED_COMPLETE' ? '✓' : '✗'}] ${r.subsystem.padEnd(28)} -> ${r.status}`);
    });
    console.log('----------------------------------------------------');
    console.log(`Verdict:                   ${report.verdict}`);
    console.log(`Report Saved:              ${target1}`);
    console.log('====================================================');
    console.log(`Status: ${report.status === 'COMPLETED' ? 'PROCEDURE 13 COMPLETED — HONEST VERIFICATION CONFIRMED' : 'REPORTED AS INCOMPLETE'}`);
  } catch (err) {
    console.error('Procedure 13 verification failed:', err);
    process.exit(1);
  }
}

main();
