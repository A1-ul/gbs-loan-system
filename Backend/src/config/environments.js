/**
 * GBS Enterprise 4-Environment Configuration & Provenance Matrix
 * Separates Development, Test, Staging, and Production cleanly (DB, Redis, Secrets, Provenance).
 * Standard: Node.js CommonJS
 */

const VALID_ENVIRONMENTS = ['development', 'test', 'staging', 'production'];

function normalizeEnvironment(env) {
  const raw = String(env || process.env.NODE_ENV || 'development').toLowerCase();
  if (raw === 'prod') return 'production';
  if (raw === 'stage') return 'staging';
  if (VALID_ENVIRONMENTS.includes(raw)) return raw;
  return 'development';
}

function getEnvironmentProfile() {
  const env = normalizeEnvironment(process.env.NODE_ENV);
  const envTagMap = {
    development: 'DEVELOPMENT',
    test: 'TEST',
    staging: 'STAGING',
    production: 'PRODUCTION',
  };

  const defaultSourceMap = {
    development: 'DEVELOPMENT_SEED',
    test: 'DEVELOPMENT_SEED',
    staging: 'STAGING_TEST',
    production: 'PRODUCTION_LIVE',
  };

  return {
    nodeEnv: env,
    environmentTag: envTagMap[env],
    defaultDataSource: defaultSourceMap[env],
    isProduction: env === 'production',
    allowSeeders: env !== 'production' && process.env.ALLOW_DEV_SEEDERS !== 'false',
    redisDbIndex: env === 'production' ? 0 : env === 'staging' ? 1 : env === 'test' ? 2 : 3,
    redisNamespace: `gbs:${env}:`,
    strictJwtValidation: true,
    requireRealOtpInProduction: env === 'production',
  };
}

function getRecordProvenance(overrideSource = null) {
  const profile = getEnvironmentProfile();
  const dataSource = overrideSource || (profile.isProduction ? 'PRODUCTION_LIVE' : 'DEVELOPMENT_SEED');
  return {
    dataSource,
    environmentTag: profile.environmentTag,
    isProductionRecord: dataSource === 'PRODUCTION_LIVE',
  };
}

module.exports = {
  VALID_ENVIRONMENTS,
  normalizeEnvironment,
  getEnvironmentProfile,
  getRecordProvenance,
};

