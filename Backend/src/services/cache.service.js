const { createRedisClient } = require('../config/redis');

class CacheService {
  constructor() {
    this.redis = createRedisClient({ lazyConnect: true });
  }

  async get(key) {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async set(key, value, ttlSeconds = 3600) {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      // Ignore cache failure in fallback mode
    }
  }
}

module.exports = new CacheService();
