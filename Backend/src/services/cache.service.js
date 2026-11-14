const { createRedisClient } = require('../config/redis');

class CacheService {
  constructor() {
    this.memCache = new Map();
    this.redis = createRedisClient({ lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 1 });
  }

  async get(key) {
    try {
      if (this.redis) {
        const data = await this.redis.get(key);
        if (data) return JSON.parse(data);
      }
    } catch {
      // Fallback to in-memory cache
    }
    const entry = this.memCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.memCache.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key, value, ttlSeconds = 3600) {
    this.memCache.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + Number(ttlSeconds) * 1000 : null,
    });
    try {
      if (this.redis) {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      }
    } catch {
      // Ignore cache failure in fallback mode
    }
  }
}

module.exports = new CacheService();
