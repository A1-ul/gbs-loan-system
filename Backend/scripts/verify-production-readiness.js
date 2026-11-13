/**
 * GBS LOAN MANAGEMENT SYSTEM - PROCEDURE 15 PRODUCTION READINESS CLI
 * Run: node Backend/scripts/verify-production-readiness.js
 * Standard: Node.js CommonJS
 */

const auditor = require('../src/modules/developer-platform/services/productionReadinessAuditor.service');

async function main() {
  console.log('====================================================');
  console.log('  GBS LOAN MANAGEMENT SYSTEM - PROCEDURE 15 AUDIT');
  console.log('  PRODUCTION READINESS VERIFICATION (6 PILLARS)');
  console.log('====================================================');

  try {
    const { target1, report } = await auditor.saveReport();

    console.log(`Production Readiness Score: ${report.readinessScore} / 100`);
    console.log(`System Status:              ${report.status}`);
    console.log('----------------------------------------------------');
    report.pillars.forEach((p) => {
      console.log(`[✓] Pillar: ${p.pillar.padEnd(14)} -> ${p.status}`);
      p.checks.forEach((c) => {
        console.log(`    - ${c.item}: ${c.details}`);
      });
    });
    console.log('----------------------------------------------------');
    console.log(`Verdict:                   ${report.verdict}`);
    console.log(`Report Saved:              ${target1}`);
    console.log('====================================================');
    console.log(`Status: ${report.status === 'PRODUCTION_READY' ? 'PROCEDURE 15 COMPLETED — PRODUCTION READY' : 'ACTION REQUIRED'}`);
  } catch (err) {
    console.error('Procedure 15 verification failed:', err);
    process.exit(1);
  }
}

main();
