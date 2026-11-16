/**
 * GBS Loan Management System - Resilient Production Startup Script for Cloud Hosting (Render, Railway, etc.)
 * Ensures database migrations, baseline schema, seeders, and Express server boot cleanly.
 */

const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const logger = {
  info: (msg) => console.log(`[Production Startup] INFO: ${msg}`),
  warn: (msg) => console.warn(`[Production Startup] WARN: ${msg}`),
  error: (msg) => console.error(`[Production Startup] ERROR: ${msg}`),
};

async function prepareAndStart() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  logger.info(`Initiating production launch sequence (Database configured: ${hasDatabaseUrl})...`);

  if (hasDatabaseUrl) {
    // 1. Run Prisma Migrations with graceful fallback
    try {
      logger.info('Executing database migrations (prisma migrate deploy)...');
      execSync('npx prisma migrate deploy', {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
        env: process.env,
        timeout: 60000,
      });
      logger.info('Database migrations deployed successfully.');
    } catch (migErr) {
      logger.warn(`Prisma migrate deploy encountered an issue: ${migErr.message}. Continuing boot sequence...`);
    }

    // 2. Ensure feedbacks table and indexes exist
    try {
      const { prisma } = require('../src/config/database');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS feedbacks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id VARCHAR(191),
          user_id VARCHAR(191),
          submitter_name VARCHAR(255) NOT NULL,
          submitter_email VARCHAR(255),
          submitter_phone VARCHAR(50),
          submitter_role VARCHAR(100),
          category VARCHAR(100) NOT NULL DEFAULT 'GENERAL',
          rating INTEGER DEFAULT 5,
          subject VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          status VARCHAR(50) DEFAULT 'RECEIVED',
          developer_response TEXT,
          owner_response TEXT,
          responded_by VARCHAR(255),
          responded_at TIMESTAMP,
          device_info JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_feedbacks_tenant_id ON feedbacks(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
        CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);
      `).catch(() => null);
    } catch (fbErr) {
      logger.warn(`Feedback table verification note: ${fbErr.message}`);
    }

    // 3. Run Database Seeder (Safely)
    try {
      logger.info('Executing baseline database seed check...');
      execSync('node prisma/seed.js', {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'inherit',
        env: process.env,
        timeout: 60000,
      });
      logger.info('Baseline seed check completed.');
    } catch (seedErr) {
      logger.warn(`Seed execution notice: ${seedErr.message}. Continuing boot sequence...`);
    }
  } else {
    logger.warn('DATABASE_URL is not set. Operating in zero-config demo / memory mode.');
  }

  // 4. Start Enterprise Express Backend (which also serves Frontend SPA from Frontend/dist)
  logger.info('Starting GBS Enterprise HTTP Server...');
  require('../src/server');
}

prepareAndStart().catch((fatalErr) => {
  logger.error(`Critical startup error: ${fatalErr.message}`);
  // Even if preparation throws, attempt to launch server so health checks and diagnostics stay active
  try {
    require('../src/server');
  } catch (srvErr) {
    logger.error(`Server launch failure: ${srvErr.message}`);
    process.exit(1);
  }
});
