/**
 * GBS Enterprise System Validator (Step 9)
 * Validates the 100% compliance of the entire GBS Enterprise System against the Master Blueprint.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function checkDirs(label, baseDir, expectedList) {
  console.log(`\n==================================================`);
  console.log(`CHECKING: ${label}`);
  console.log(`Location: ${baseDir}`);
  console.log(`==================================================`);
  let passed = 0;
  for (const name of expectedList) {
    const full = path.join(ROOT, baseDir, name);
    if (!fs.existsSync(full)) {
      console.log(`❌ MISSING FOLDER: ${baseDir}/${name}`);
    } else {
      const files = fs.readdirSync(full);
      if (files.length === 0) {
        console.log(`⚠️ EMPTY FOLDER: ${baseDir}/${name}`);
      } else {
        console.log(`✅ [OK] ${name} (${files.length} items)`);
        passed++;
      }
    }
  }
  const pct = Math.round((passed / expectedList.length) * 100);
  console.log(`Result: ${passed}/${expectedList.length} (${pct}%)`);
  return { passed, total: expectedList.length, pct };
}

function checkMisplacedDuplicates() {
  console.log(`\n==================================================`);
  console.log(`CHECKING FOR MISPLACED DUPLICATES`);
  console.log(`==================================================`);
  const pagesDir = path.join(ROOT, 'Frontend/src/pages');
  const loanFiles = ['CreateLoan.jsx', 'LoanApproval.jsx', 'LoanDetails.jsx', 'LoanRepayment.jsx', 'Loans.jsx'];
  let found = 0;

  for (const item of fs.readdirSync(pagesDir)) {
    if (item === 'loans') continue;
    const full = path.join(pagesDir, item);
    if (fs.statSync(full).isDirectory()) {
      for (const lf of loanFiles) {
        if (fs.existsSync(path.join(full, lf))) {
          console.log(`❌ Misplaced duplicate: Frontend/src/pages/${item}/${lf}`);
          found++;
        }
      }
    }
  }

  if (found === 0) {
    console.log(`✅ Zero misplaced loan duplicates detected in other domain pages!`);
  } else {
    console.log(`❌ Found ${found} misplaced loan duplicates!`);
  }
  return found === 0;
}

function checkAllEmptyDirs(dir, list = []) {
  const items = fs.readdirSync(dir);
  if (items.length === 0) {
    list.push(dir);
    return list;
  }
  for (const item of items) {
    if (['node_modules', '.git', '.build', 'coverage', 'dist'].includes(item)) continue;
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      checkAllEmptyDirs(full, list);
    }
  }
  return list;
}

function runMasterValidation() {
  console.log(`**************************************************`);
  console.log(`GBS ENTERPRISE DEVELOPMENT METHODOLOGY VALIDATOR`);
  console.log(`Master Blueprint 100% Verification Protocol`);
  console.log(`**************************************************`);

  // Step 1: Framework
  const s1 = checkDirs(
    'Step 1 — GBS Enterprise Framework (13 Pillars)',
    'Backend/src/framework',
    [
      'architecture', 'security', 'authentication', 'rbac', 'notifications',
      'audit', 'monitoring', 'devops', 'gateway', 'ai', 'shared', 'developer', 'standards'
    ]
  );

  // Step 2: Backend Structure
  const s2 = checkDirs(
    'Step 2 — GBS Enterprise Backend Structure (13 Layers)',
    'Backend/src',
    [
      'api', 'controllers', 'services', 'repositories', 'middleware',
      'jobs', 'queues', 'events', 'config', 'security', 'monitoring', 'tests', 'docs'
    ]
  );

  // Step 3: Frontend Structure
  const s3 = checkDirs(
    'Step 3 — GBS Enterprise Frontend Structure (11 Pillars)',
    'Frontend/src',
    [
      'pages', 'dashboards', 'components', 'layouts', 'routes',
      'hooks', 'state', 'services', 'assets', 'themes', 'tests'
    ]
  );

  // Step 4: Database Structure
  const s4 = checkDirs(
    'Step 4 — GBS Enterprise Database Structure (9 Layers)',
    'database',
    [
      'erd', 'tables', 'relationships', 'constraints', 'indexes',
      'migrations', 'seeders', 'audit-tables', 'history-tables'
    ]
  );

  // Step 5: Developer Platform Structure
  const s5 = checkDirs(
    'Step 5 — GBS Enterprise Developer Platform Structure (12 Pillars)',
    'Backend/src/modules/developer-platform',
    [
      'remote-monitoring', 'live-diagnostics', 'crash-reports', 'system-lock',
      'subscription-control', 'deployment-history', 'logs', 'performance',
      'backup-restore', 'recovery', 'security-alerts', 'tenant-management'
    ]
  );

  const dupesClean = checkMisplacedDuplicates();

  console.log(`\n==================================================`);
  console.log(`CHECKING FOR ANY REMAINING EMPTY DIRECTORIES`);
  console.log(`==================================================`);
  const emptyDirs = checkAllEmptyDirs(ROOT);
  if (emptyDirs.length === 0) {
    console.log(`✅ ZERO empty directories in the entire workspace!`);
  } else {
    console.log(`⚠️ Empty directories found (${emptyDirs.length}):`);
    emptyDirs.forEach(d => console.log('  -', path.relative(ROOT, d)));
  }

  console.log(`\n**************************************************`);
  console.log(`FINAL MASTER VALIDATION SCORECARD`);
  console.log(`**************************************************`);
  console.log(`Step 1 Framework Pillars        : ${s1.passed}/${s1.total} (${s1.pct}%)`);
  console.log(`Step 2 Backend Structure       : ${s2.passed}/${s2.total} (${s2.pct}%)`);
  console.log(`Step 3 Frontend Structure      : ${s3.passed}/${s3.total} (${s3.pct}%)`);
  console.log(`Step 4 Database Structure      : ${s4.passed}/${s4.total} (${s4.pct}%)`);
  console.log(`Step 5 Developer Platform      : ${s5.passed}/${s5.total} (${s5.pct}%)`);
  console.log(`Misplaced Loan Files Cleaned   : ${dupesClean ? '100% CLEAN' : 'FAIL'}`);
  console.log(`Workspace Empty Dirs Cleaned   : ${emptyDirs.length === 0 ? '100% CLEAN (0 empty)' : 'FAIL'}`);

  const allPassed = s1.pct === 100 && s2.pct === 100 && s3.pct === 100 && s4.pct === 100 && s5.pct === 100 && dupesClean && emptyDirs.length === 0;

  console.log(`\nFINAL SYSTEM STATUS: ${allPassed ? '100% MASTER BLUEPRINT COMPLIANT ✅' : 'ATTENTION REQUIRED ⚠️'}`);
  console.log(`**************************************************\n`);

  process.exit(allPassed ? 0 : 1);
}

runMasterValidation();
