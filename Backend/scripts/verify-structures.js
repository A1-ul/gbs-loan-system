/**
 * GBS LOAN MANAGEMENT SYSTEM - PROCEDURE 9 STRUCTURES VERIFICATION CLI
 * Run: node Backend/scripts/verify-structures.js
 * Standard: Node.js CommonJS
 */

const structureManager = require('../src/modules/developer-platform/services/structureManager.service');

function main() {
  console.log('====================================================');
  console.log('  GBS LOAN MANAGEMENT SYSTEM - STRUCTURES AUDIT (PROCEDURE 9)');
  console.log('====================================================');

  try {
    const { target1, report } = structureManager.saveStructuresReport();

    console.log(`Total Structures Audited:  ${report.metrics.totalStructuresAudited}`);
    console.log(`Structures Built:          ${report.metrics.totalStructuresBuilt}`);
    console.log(`Structures Missing:        ${report.metrics.totalStructuresMissing}`);
    console.log(`Completion Rate:           ${report.metrics.completionRate}`);
    console.log('----------------------------------------------------');
    console.log('Key Built Subsystems:');
    report.structures.forEach((s) => {
      console.log(`  [${s.exists ? '✓' : '✗'}] ${s.id.padEnd(35)} -> ${s.path} (${s.sizeBytes} bytes)`);
    });

    console.log('----------------------------------------------------');
    console.log(`Report Saved:              ${target1}`);
    console.log('====================================================');
    console.log(`Status: ${report.status === 'COMPLIANT_AND_BUILT' ? 'PROCEDURE 9 COMPLETED — ALL REQUIRED STRUCTURES BUILT & VERIFIED' : 'ACTION REQUIRED'}`);
  } catch (err) {
    console.error('Structure verification failed:', err);
    process.exit(1);
  }
}

main();
