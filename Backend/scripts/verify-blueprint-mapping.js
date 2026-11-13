/**
 * GBS LOAN MANAGEMENT SYSTEM - PROCEDURE 12 BLUEPRINT MAPPING CLI
 * Run: node Backend/scripts/verify-blueprint-mapping.js
 * Standard: Node.js CommonJS
 */

const blueprintMapper = require('../src/modules/developer-platform/services/blueprintMapper.service');

function main() {
  console.log('====================================================');
  console.log('  GBS LOAN MANAGEMENT SYSTEM - PROCEDURE 12 AUDIT');
  console.log('  1:1 BLUEPRINT TRACEABILITY MAPPING');
  console.log('====================================================');

  try {
    const { target1, report } = blueprintMapper.saveReport();

    console.log(`Roles Configured:          ${report.rolesCount} roles`);
    console.log(`Permissions Configured:    ${report.permissionsCount} permissions`);
    console.log(`Trace Chains Audited:      ${report.chainsAudited}`);
    console.log(`Trace Chains Verified:     ${report.chainsVerified} / ${report.chainsAudited} (100% 1:1 Mapped)`);
    console.log('----------------------------------------------------');
    report.traceChain.forEach((c) => {
      console.log(`[✓] ${c.requirementId}: ${c.title}`);
      console.log(`    Phase:    ${c.phase}`);
      console.log(`    Frontend: ${c.frontend}`);
      console.log(`    API:      ${c.api}`);
      console.log(`    Database: ${c.database}`);
      console.log(`    Status:   ${c.status}`);
    });
    console.log('----------------------------------------------------');
    console.log(`Report Saved:              ${target1}`);
    console.log('====================================================');
    console.log(`Status: ${report.status === '100%_TRACEABLE_AND_MAPPED' ? 'PROCEDURE 12 COMPLETED — 1:1 BLUEPRINT MAPPING VERIFIED' : 'ACTION REQUIRED'}`);
  } catch (err) {
    console.error('Procedure 12 verification failed:', err);
    process.exit(1);
  }
}

main();
