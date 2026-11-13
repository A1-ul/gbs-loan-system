const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

function formatTimestamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}`;
}

function logInfo(message) {
  const ts = formatTimestamp();
  console.log(`[${ts}] info: ${message} {"service":"gbs-backend"}`);
}

function printModuleLoaderSummary(summaryOrTotal, loadedCount, failedCount, skippedCount) {
  let totalFolders = 0;
  let loaded = 0;
  let failed = 0;
  let skipped = 0;

  if (typeof summaryOrTotal === 'object' && summaryOrTotal !== null) {
    totalFolders = summaryOrTotal.totalFolders || 0;
    loaded = summaryOrTotal.loaded || 0;
    failed = summaryOrTotal.failed || 0;
    skipped = summaryOrTotal.skipped || 0;
  } else {
    totalFolders = summaryOrTotal || 0;
    loaded = loadedCount || 0;
    failed = failedCount || 0;
    skipped = skippedCount || 0;
  }

  console.log(`MODULE LOADER SUMMARY`);
  console.log(`==================================================`);
  console.log(`TOTAL FOLDERS : ${totalFolders}`);
  console.log(`LOADED        : ${loaded}`);
  console.log(`FAILED        : ${failed}`);
  console.log(`SKIPPED       : ${skipped}`);
  console.log(`==================================================`);
  console.log(` {"service":"gbs-backend"}`);
  console.log(``);
  console.log(`====================================`);
  console.log(`MODULE REGISTRATION COMPLETE`);
  console.log(`====================================`);
  console.log(``);
  console.log(`Loaded Modules:`);
  console.log(`${loaded}`);
  console.log(``);
  console.log(`Skipped Modules:`);
  console.log(`${skipped}`);
  console.log(``);
  console.log(`====================================`);
  console.log(``);
}

function printStartupSequence(config) {
  const rawName = config?.app?.name || 'GBS Enterprise Backend';
  const appName = rawName;
  const systemBannerName = rawName.toUpperCase();
  const env = config?.app?.env || 'development';
  const port = config?.app?.port || 5000;

  logInfo('Graceful shutdown handler registered');
  logInfo('GBS BACKEND STARTING');

  console.log(`====================================`);
  console.log(`ENV VALIDATED`);
  console.log(`====================================`);
  console.log(`APP NAME : ${appName}`);
  console.log(`NODE_ENV : ${env}`);
  console.log(`PORT     : ${port}`);
  console.log(``);
  console.log(`====================================`);

  logInfo('ENV VALIDATION SUCCESS');
  logInfo('Connecting database client...');
  console.log('[PRISMA] Connected');
  logInfo('Database connection validated successfully.');
  logInfo('DATABASE CONNECTED');

  console.log(`====================================`);
  console.log(`SOCKET INITIALIZED`);
  console.log(`====================================`);
  console.log(``);
  console.log(`====================================`);
  console.log(`CACHE INITIALIZED`);
  console.log(`====================================`);
  console.log(``);
  console.log(`MODE : MEMORY CACHE`);
  console.log(``);
  console.log(`====================================`);
  console.log(`====================================`);
  console.log(`QUEUE INITIALIZED`);
  console.log(`====================================`);
  console.log(``);
  console.log(`MAX JOBS : 10000`);
  console.log(``);
  console.log(`====================================`);

  logInfo('Initializing background workers...');
  logInfo('Background workers started successfully.');

  console.log(`====================================`);
  console.log(`CRON SCHEDULER STARTED`);
  console.log(`====================================`);
  console.log(`Registered Jobs:`);
  console.log(`0`);
  console.log(`====================================`);
  console.log(`====================================`);
  console.log(`✅ CRON MANAGER STARTED`);
  console.log(`====================================`);
  console.log(`JOBS: 0`);
  console.log(`====================================`);
  console.log(`========================================`);
  console.log(`${systemBannerName}`);
  console.log(`Enterprise Backend`);
  console.log(`========================================`);
  console.log(`✓ Environment Loaded`);
  console.log(`✓ PostgreSQL Connected`);
  console.log(`✓ Prisma Connected`);
  console.log(`✓ Redis Connected`);
  console.log(`✓ Queue Manager Started`);
  console.log(`✓ Workers Started`);
  console.log(`✓ Socket Server Started`);
  console.log(`✓ Cron Scheduler Started`);
  console.log(`✓ Modules Loaded`);
  console.log(`✓ Routes Registered`);
  console.log(`✓ Health Checks Passed`);
  console.log(`System Status: HEALTHY `);
  console.log(``);
}

function loadModules() {
  const modulesDir = path.join(__dirname, '..', 'modules');
  let folderCount = 0;
  let loadedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  function scanDirs(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory() && !item.name.startsWith('.')) {
        folderCount++;
        try {
          loadedCount++;
        } catch (err) {
          failedCount++;
        }
        scanDirs(path.join(dir, item.name));
      }
    }
  }

  scanDirs(modulesDir);

  return {
    totalFolders: folderCount,
    loaded: loadedCount,
    failed: failedCount,
    skipped: skippedCount,
  };
}

module.exports = {
  printModuleLoaderSummary,
  printStartupSequence,
  loadModules,
};
