/**
 * GBS LOAN MANAGEMENT SYSTEM - POSTGRESQL & SECRETS AUDIT CLI
 * Run: node Backend/scripts/verify-postgres.js
 * Standard: Node.js CommonJS
 */

const postgresManager = require('../src/modules/developer-platform/services/postgresManager.service');

function main() {
  console.log('====================================================');
  console.log('  GBS LOAN MANAGEMENT SYSTEM - POSTGRESQL & SECRETS AUDIT');
  console.log('====================================================');

  try {
    const { target1, report } = postgresManager.savePostgresReport();

    console.log(`Database Engine:       ${report.databaseEngine.detected} (Required: ${report.databaseEngine.required})`);
    console.log(`Prisma ORM Source:    ${report.databaseEngine.schemaFile}`);
    console.log(`Connection Env Var:   ${report.databaseEngine.connectionStringEnvVar}`);
    console.log('----------------------------------------------------');
    console.log('Schema Topology:');
    console.log(`  • Total Models:      ${report.schemaIntegrity.totalModels}`);
    console.log(`  • Total Enums:       ${report.schemaIntegrity.totalEnums}`);
    console.log(`  • Roles in Schema:   ${report.schemaIntegrity.canonicalRolesCovered} roles defined`);
    console.log(`  • Multi-Tenancy:     ${report.schemaIntegrity.multiTenancySupported ? 'SUPPORTED' : 'UNVERIFIED'}`);
    console.log('----------------------------------------------------');
    console.log('Secrets & Credential Security:');
    console.log(`  • Root .gitignore:   ${report.auditChecks.gitIgnoreRoot}`);
    console.log(`  • Backend .gitignore:${report.auditChecks.gitIgnoreBackend}`);
    console.log(`  • Frontend Leak Scan:${report.auditChecks.frontendLeakScan}`);
    console.log(`  • Secrets in Source: ${report.secretsPolicy.hardcodedSecretsInSource}`);
    console.log('----------------------------------------------------');
    console.log(`Report Saved:          ${target1}`);
    console.log('====================================================');
    console.log(`Status: ${report.status === 'COMPLIANT_AND_SECURED' ? 'POSTGRESQL VERIFIED & CREDENTIALS 100% SECURE' : 'ACTION REQUIRED'}`);
  } catch (err) {
    console.error('PostgreSQL audit failed:', err);
    process.exit(1);
  }
}

main();
