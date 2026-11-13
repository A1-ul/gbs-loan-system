/**
 * GBS Enterprise Database Structure
 * Step 4 of GBS Enterprise Development Methodology
 * 
 * Includes:
 * 1. ERD (Entity Relationship Diagrams)
 * 2. Tables (DDL SQL definitions)
 * 3. Relationships (Foreign keys, cardinality)
 * 4. Constraints (Check constraints, cascade rules)
 * 5. Indexes (Performance, composite, full-text indexes)
 * 6. Migrations (Versioned migration scripts)
 * 7. Seeders (Master data & initial roles)
 * 8. Audit Tables (Compliance & immutable audit logs)
 * 9. History Tables (Temporal tracking & archival ledgers)
 */

const fs = require('fs');
const path = require('path');

const auditTables = require('./audit-tables');
const historyTables = require('./history-tables');
const dictionary = require('./dictionary');

module.exports = {
  name: 'GBS Enterprise Database',
  version: '2.0.0',
  dialect: 'PostgreSQL',
  structure: {
    erd: path.join(__dirname, 'erd'),
    tables: path.join(__dirname, 'tables'),
    relationships: path.join(__dirname, 'relationships'),
    constraints: path.join(__dirname, 'constraints'),
    indexes: path.join(__dirname, 'indexes'),
    migrations: path.join(__dirname, 'migrations'),
    seeders: path.join(__dirname, 'seeders'),
    auditTables: path.join(__dirname, 'audit-tables'),
    historyTables: path.join(__dirname, 'history-tables'),
    dictionary: path.join(__dirname, 'dictionary'),
    backups: path.join(__dirname, 'backups'),
  },
  auditTables,
  historyTables,
  dictionary,
};
