const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

let redisClient = null;

function createRedisClient(extraOptions = {}) {
  const baseOptions = {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    ...extraOptions,
  };

  if (config.redis.url) {
    const tlsOpts = config.redis.url.startsWith('rediss://')
      ? { tls: { rejectUnauthorized: false } }
      : {};
    return new Redis(config.redis.url, { ...tlsOpts, ...baseOptions });
  }

  return new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    ...baseOptions,
  });
}

function getRedisClient() {
  if (!redisClient) {
    redisClient = createRedisClient();

    redisClient.on('connect', () => logger.info('Redis connected'));
    redisClient.on('error', (err) => logger.error('Redis error:', err));
  }
  return redisClient;
}

async function checkRedisHealth() {
  try {
    const client = getRedisClient();
    const pong = await client.ping();
    return { status: 'healthy', connected: pong === 'PONG' };
  } catch (error) {
    return { status: 'unhealthy', connected: false, error: error.message };
  }
}

module.exports = {
  createRedisClient,
  getRedisClient,
  checkRedisHealth,
};
