/**
 * GBS LOAN MANAGEMENT SYSTEM - INVENTORY AUDIT CLI
 * Run: node Backend/scripts/verify-inventory.js
 * Standard: Node.js CommonJS
 */

const verifier = require('../src/modules/developer-platform/services/projectVerifier.service');

async function main() {
  console.log('====================================================');
  console.log('  GBS LOAN MANAGEMENT SYSTEM - PROJECT INVENTORY AUDIT');
  console.log('====================================================');

  try {
    const { outputPath, report } = await verifier.saveInventoryReport();
    console.log(`TOTAL EXISTING FOLDERS: ${report.inventory.totalExistingFolders}`);
    console.log(`TOTAL EXISTING FILES:   ${report.inventory.totalExistingFiles}`);
    console.log(`TOTAL REQUIRED FOLDERS: ${report.inventory.totalRequiredFolders}`);
    console.log(`TOTAL REQUIRED FILES:   ${report.inventory.totalRequiredFiles}`);
    console.log(`MISSING FOLDERS:        ${report.inventory.missingFoldersCount}`);
    console.log(`MISSING FILES:          ${report.inventory.missingFilesCount}`);
    console.log(`STUBS IDENTIFIED:       ${report.inventory.stubsIdentifiedCount}`);
    console.log('----------------------------------------------------');
    console.log('Breakdown by Area:');
    for (const [area, data] of Object.entries(report.breakdown)) {
      console.log(`  - ${area.padEnd(12)}: ${data.folders} folders, ${data.files} files`);
    }
    console.log('----------------------------------------------------');
    console.log('Detected Structural Duplicates:');
    for (const dup of report.duplicates) {
      console.log(`  - [${dup.type}]: ${dup.action}`);
    }
    console.log('====================================================');
    console.log('Audit completed successfully. Source of truth: MASTER BLUEPRINT V2.0');
  } catch (err) {
    console.error('Audit failed:', err);
    process.exit(1);
  }
}

main();
