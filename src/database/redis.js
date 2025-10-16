const Redis = require('ioredis');
const config = require('../config/config');
const logger = require('../utils/logger');

class RedisConnection {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  connect() {
    if (this.isConnected && this.client) {
      return this.client;
    }

    logger.info('Connecting to Redis...', { 
      host: config.redis.host, 
      port: config.redis.port 
    });

    this.client = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      retryStrategy: config.redis.retryStrategy,
      maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
      lazyConnect: true
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis connected successfully');
    });

    this.client.on('error', (error) => {
      logger.error('Redis connection error:', error);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    // Actually connect
    this.client.connect().catch((error) => {
      logger.error('Failed to connect to Redis:', error);
    });

    return this.client;
  }

  getClient() {
    if (!this.client) {
      this.connect();
    }
    return this.client;
  }

  async disconnect() {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis disconnected');
    }
  }

  async pushToQueue(queueName, data) {
    try {
      const client = this.getClient();
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
      await client.rpush(queueName, dataStr);
      return true;
    } catch (error) {
      logger.error('Error pushing to queue:', { queueName, error: error.message });
      return false;
    }
  }

  async popFromQueue(queueName, timeoutSeconds = 5) {
    try {
      const client = this.getClient();
      const result = await client.blpop(queueName, timeoutSeconds);
      
      if (result) {
        const [, message] = result;
        return JSON.parse(message);
      }
      return null;
    } catch (error) {
      logger.error('Error popping from queue:', { queueName, error: error.message });
      return null;
    }
  }

  async getQueueLength(queueName) {
    try {
      const client = this.getClient();
      return await client.llen(queueName);
    } catch (error) {
      logger.error('Error getting queue length:', { queueName, error: error.message });
      return 0;
    }
  }
}

// Singleton instance
const redisConnection = new RedisConnection();

module.exports = redisConnection;
