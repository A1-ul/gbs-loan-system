/**
 * GBS LOAN MANAGEMENT SYSTEM - COMMONJS COMPLIANCE VERIFICATION CLI
 * Run: node Backend/scripts/verify-commonjs.js
 * Standard: Node.js CommonJS Only
 */

const enforcer = require('../src/modules/developer-platform/services/commonJsEnforcer.service');

function main() {
  console.log('====================================================');
  console.log('  GBS LOAN MANAGEMENT SYSTEM - COMMONJS ONLY AUDIT');
  console.log('====================================================');

  try {
    const { target1, report } = enforcer.saveComplianceReport();

    console.log(`Backend Standard:      ${report.standards.mandate}`);
    console.log(`Forbidden Syntax:      ${report.standards.forbidden.join(', ')}`);
    console.log('----------------------------------------------------');
    console.log(`Total Files Scanned:   ${report.metrics.totalBackendJsFilesScanned}`);
    console.log(`Compliant Files:       ${report.metrics.compliantFilesCount}`);
    console.log(`Violations Detected:   ${report.metrics.violationsCount}`);
    console.log(`Compliance Rate:       ${report.metrics.compliancePercentage}`);
    console.log(`package.json Standard: ${report.metrics.packageJsonType} (Valid: ${report.metrics.packageJsonCompliant})`);
    console.log('----------------------------------------------------');
    console.log('Verified Subsystems:');
    report.verifiedDirectories.forEach((dir) => {
      console.log(`  [✓] ${dir}`);
    });

    console.log('----------------------------------------------------');
    console.log(`Report Saved:          ${target1}`);
    console.log('====================================================');
    console.log(`Status: ${report.status === 'COMPLIANT_100_PERCENT' ? '100% COMMONJS COMPLIANT — ZERO ESM IMPORTS/EXPORTS' : 'NON-COMPLIANT'}`);
  } catch (err) {
    console.error('CommonJS verification failed:', err);
    process.exit(1);
  }
}

main();
