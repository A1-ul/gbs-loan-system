require('dotenv').config();
const { getEnvironmentProfile } = require('./environments');

const envProfile = getEnvironmentProfile();

module.exports = {
  app: {
    name: process.env.APP_NAME || 'GBS Loan Management System',
    env: envProfile.nodeEnv,
    port: parseInt(process.env.PORT, 10) || 5000,
    apiVersion: process.env.API_VERSION || 'v1',
    url: process.env.APP_URL || 'http://localhost:5000',
  },
  envProfile,
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  jwt: {
    secret: process.env.JWT_SECRET || (envProfile.isProduction ? null : 'gbs-dev-jwt-secret-change-in-prod'),
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || (envProfile.isProduction ? null : 'gbs-dev-refresh-secret-change-in-prod'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    developerSecret: process.env.DEVELOPER_JWT_SECRET || (envProfile.isProduction ? null : 'gbs-dev-landlord-isolated-secret'),
    voiceSecret: process.env.VOICE_AUTH_SECRET || (envProfile.isProduction ? null : 'gbs-dev-voice-biometric-secret'),
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY,
    iv: process.env.ENCRYPTION_IV,
  },
  totp: {
    issuer: process.env.TOTP_ISSUER || 'GBS Loan System',
    window: parseInt(process.env.TOTP_WINDOW, 10) || 1,
  },
  redis: {
    url: process.env.REDIS_URL || null,
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: envProfile.redisDbIndex,
  },
  maps: {
    googleApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  },
  momo: {
    baseUrl: process.env.MOMO_API_BASE_URL,
    subscriptionKey: process.env.MOMO_SUBSCRIPTION_KEY,
    apiUser: process.env.MOMO_API_USER,
    apiKey: process.env.MOMO_API_KEY,
    targetEnvironment: process.env.MOMO_TARGET_ENVIRONMENT || 'sandbox',
    callbackUrl: process.env.MOMO_CALLBACK_URL,
  },
  ghanaCard: {
    apiUrl: process.env.GHANA_CARD_API_URL,
    apiKey: process.env.GHANA_CARD_API_KEY,
  },
  zoom: {
    apiKey: process.env.ZOOM_API_KEY,
    apiSecret: process.env.ZOOM_API_SECRET,
    accountId: process.env.ZOOM_ACCOUNT_ID,
  },
  sms: {
    provider: process.env.SMS_PROVIDER || 'hubtel',
    apiKey: process.env.SMS_API_KEY,
    apiSecret: process.env.SMS_API_SECRET,
    senderId: process.env.SMS_SENDER_ID || 'GBSLoan',
  },
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'gabosei48@gmail.com',
  },
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 10485760,
    path: process.env.UPLOAD_PATH || './uploads',
  },
  backup: {
    enabled: process.env.BACKUP_ENABLED !== 'false',
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS, 10) || 30,
    storagePath: process.env.BACKUP_STORAGE_PATH || './backups',
    cloudEnabled: process.env.CLOUD_BACKUP_ENABLED === 'true',
    cloudBucket: process.env.CLOUD_BACKUP_BUCKET,
  },
  metrics: {
    enabled: process.env.METRICS_ENABLED !== 'false',
    port: parseInt(process.env.METRICS_PORT, 10) || 9090,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 5000,
  },
  gps: {
    trackingIntervalMs: parseInt(process.env.GPS_TRACKING_INTERVAL_MS, 10) || 30000,
    offlineSyncEnabled: process.env.GPS_OFFLINE_SYNC_ENABLED !== 'false',
  },
  loan: {
    defaultInterestRate: parseFloat(process.env.DEFAULT_INTEREST_RATE) || 15.0,
    defaultPenaltyRate: parseFloat(process.env.DEFAULT_PENALTY_RATE) || 5.0,
    defaultTermMonths: parseInt(process.env.DEFAULT_LOAN_TERM_MONTHS, 10) || 12,
  },
};
