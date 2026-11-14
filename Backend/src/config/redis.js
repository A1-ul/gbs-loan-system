const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

let redisClient = null;
const memoryStore = new Map();

function createInMemoryRedisClient() {
  return {
    isInMemoryFallback: true,
    status: 'ready',
    on: () => {},
    quit: async () => 'OK',
    disconnect: () => {},
    ping: async () => 'PONG',
    get: async (key) => {
      const entry = memoryStore.get(key);
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        memoryStore.delete(key);
        return null;
      }
      return entry.value;
    },
    set: async (key, value, mode, ttlSeconds) => {
      const expiresAt = mode === 'EX' && ttlSeconds ? Date.now() + Number(ttlSeconds) * 1000 : null;
      memoryStore.set(key, { value: String(value), expiresAt });
      return 'OK';
    },
    del: async (key) => (memoryStore.delete(key) ? 1 : 0),
  };
}

function isRedisConfigured() {
  if (process.env.REDIS_DISABLED === 'true') return false;
  if (config.redis.url) return true;
  if (config.env === 'production') return false;
  return Boolean(process.env.REDIS_HOST && !['disabled', 'none'].includes(String(process.env.REDIS_HOST).toLowerCase()));
}

function createRedisClient(extraOptions = {}) {
  if (!isRedisConfigured()) {
    return null;
  }

  const baseOptions = {
    maxRetriesPerRequest: extraOptions.maxRetriesPerRequest !== undefined ? extraOptions.maxRetriesPerRequest : 1,
    connectTimeout: 2000,
    retryStrategy: (times) => (times > 5 ? null : Math.min(times * 100, 1000)),
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
    const client = createRedisClient({ lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1 });
    if (!client) {
      redisClient = createInMemoryRedisClient();
      logger.info('Redis URL not set — using built-in in-memory fallback store');
      return redisClient;
    }
    redisClient = client;
    redisClient.on('connect', () => logger.info('Redis connected'));
    redisClient.on('error', (err) => logger.warn(`Redis warning: ${err.message}`));
  }
  return redisClient;
}

async function checkRedisHealth() {
  if (!isRedisConfigured()) {
    return { status: 'standby', mode: 'in-memory', connected: true, optional: true };
  }
  try {
    const client = getRedisClient();
    if (client.isInMemoryFallback) {
      return { status: 'standby', mode: 'in-memory', connected: true, optional: true };
    }
    const pong = await Promise.race([
      client.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis ping timeout')), 800)),
    ]);
    return { status: pong === 'PONG' ? 'healthy' : 'unhealthy', mode: 'redis', connected: pong === 'PONG' };
  } catch (error) {
    return { status: 'standby', mode: 'in-memory-fallback', connected: false, optional: true, error: error.message };
  }
}

module.exports = {
  isRedisConfigured,
  createRedisClient,
  getRedisClient,
  checkRedisHealth,
};
