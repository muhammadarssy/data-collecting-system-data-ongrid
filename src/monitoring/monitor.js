const { EventEmitter } = require('events');
const config = require('../config/config');
const redisConnection = require('../database/redis');
const mongoDBConnection = require('../database/mongodb');
const logger = require('../utils/logger');

class SystemMonitor extends EventEmitter {
  constructor() {
    super();
    this.stats = {
      queues: {},
      mongodb: {},
      redis: {},
      system: {}
    };
    this.isRunning = false;
  }

  async start() {
    try {
      logger.info('System Monitor starting...');

      // Ensure connections
      await mongoDBConnection.connect();
      redisConnection.connect();

      this.isRunning = true;
      this.startMonitoring();

      logger.info('System Monitor started successfully');
    } catch (error) {
      logger.error('Failed to start System Monitor:', error);
      throw error;
    }
  }

  startMonitoring() {
    // Monitor every configured interval
    setInterval(async () => {
      await this.checkHealth();
    }, config.monitoring.intervalMs);

    logger.info(`Monitoring started with interval: ${config.monitoring.intervalMs}ms`);
  }

  async checkHealth() {
    try {
      // Check queue health
      await this.checkQueueHealth();

      // Check MongoDB health
      await this.checkMongoDBHealth();

      // Check Redis health
      await this.checkRedisHealth();

      // Check system resources
      this.checkSystemResources();

      // Log overall stats
      this.logStats();

      // Emit health check event
      this.emit('health-check', this.stats);

    } catch (error) {
      logger.error('Health check error:', error);
      this.emit('error', error);
    }
  }

  async checkQueueHealth() {
    try {
      const realtimeLength = await redisConnection.getQueueLength(
        config.queue.realtimeName
      );
      const historyLength = await redisConnection.getQueueLength(
        config.queue.historyName
      );
      const deadLetterLength = await redisConnection.getQueueLength(
        config.queue.deadLetterName
      );

      this.stats.queues = {
        realtime: {
          length: realtimeLength,
          threshold: config.monitoring.queueAlertThreshold.realtime,
          status: realtimeLength > config.monitoring.queueAlertThreshold.realtime 
            ? 'WARNING' 
            : 'OK'
        },
        history: {
          length: historyLength,
          threshold: config.monitoring.queueAlertThreshold.history,
          status: historyLength > config.monitoring.queueAlertThreshold.history 
            ? 'WARNING' 
            : 'OK'
        },
        deadLetter: {
          length: deadLetterLength,
          status: deadLetterLength > 0 ? 'WARNING' : 'OK'
        }
      };

      // Emit alerts if needed
      if (this.stats.queues.realtime.status === 'WARNING') {
        this.emit('alert', {
          type: 'queue_overflow',
          queue: 'realtime',
          length: realtimeLength,
          threshold: config.monitoring.queueAlertThreshold.realtime
        });
      }

      if (this.stats.queues.history.status === 'WARNING') {
        this.emit('alert', {
          type: 'queue_overflow',
          queue: 'history',
          length: historyLength,
          threshold: config.monitoring.queueAlertThreshold.history
        });
      }

      if (this.stats.queues.deadLetter.status === 'WARNING') {
        this.emit('alert', {
          type: 'dead_letter_queue_not_empty',
          queue: 'deadLetter',
          length: deadLetterLength
        });
      }

    } catch (error) {
      logger.error('Queue health check error:', error);
      this.stats.queues.status = 'ERROR';
    }
  }

  async checkMongoDBHealth() {
    try {
      const client = mongoDBConnection.getClient();
      
      if (!client) {
        this.stats.mongodb = { status: 'DISCONNECTED' };
        return;
      }

      // Ping MongoDB
      const startTime = Date.now();
      await client.db('admin').command({ ping: 1 });
      const responseTime = Date.now() - startTime;

      // Get server status
      const serverStatus = await client.db('admin').command({ serverStatus: 1 });

      this.stats.mongodb = {
        status: 'OK',
        responseTime: `${responseTime}ms`,
        connections: {
          current: serverStatus.connections?.current || 0,
          available: serverStatus.connections?.available || 0,
          total: serverStatus.connections?.totalCreated || 0
        },
        opcounters: {
          insert: serverStatus.opcounters?.insert || 0,
          query: serverStatus.opcounters?.query || 0,
          update: serverStatus.opcounters?.update || 0,
          delete: serverStatus.opcounters?.delete || 0
        },
        mem: {
          resident: `${Math.round(serverStatus.mem?.resident || 0)}MB`,
          virtual: `${Math.round(serverStatus.mem?.virtual || 0)}MB`
        }
      };

      // Alert if response time is too high
      if (responseTime > 1000) {
        this.emit('alert', {
          type: 'mongodb_slow_response',
          responseTime: `${responseTime}ms`
        });
      }

    } catch (error) {
      logger.error('MongoDB health check error:', error);
      this.stats.mongodb = { 
        status: 'ERROR',
        error: error.message 
      };
      
      this.emit('alert', {
        type: 'mongodb_error',
        error: error.message
      });
    }
  }

  async checkRedisHealth() {
    try {
      const redis = redisConnection.getClient();
      
      if (!redis) {
        this.stats.redis = { status: 'DISCONNECTED' };
        return;
      }

      // Ping Redis
      const startTime = Date.now();
      await redis.ping();
      const responseTime = Date.now() - startTime;

      // Get Redis info
      const info = await redis.info();
      const infoLines = info.split('\r\n');
      const infoObj = {};
      
      infoLines.forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          infoObj[key] = value;
        }
      });

      this.stats.redis = {
        status: 'OK',
        responseTime: `${responseTime}ms`,
        memory: {
          used: infoObj.used_memory_human || 'N/A',
          peak: infoObj.used_memory_peak_human || 'N/A'
        },
        clients: {
          connected: infoObj.connected_clients || 0
        },
        stats: {
          totalConnections: infoObj.total_connections_received || 0,
          totalCommands: infoObj.total_commands_processed || 0
        }
      };

    } catch (error) {
      logger.error('Redis health check error:', error);
      this.stats.redis = { 
        status: 'ERROR',
        error: error.message 
      };
      
      this.emit('alert', {
        type: 'redis_error',
        error: error.message
      });
    }
  }

  checkSystemResources() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    this.stats.system = {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
      },
      cpu: {
        usage: process.cpuUsage()
      }
    };
  }

  logStats() {
    logger.info('=== System Health Report ===');
    logger.info('Queues:', {
      realtime: `${this.stats.queues.realtime?.length || 0} (${this.stats.queues.realtime?.status || 'UNKNOWN'})`,
      history: `${this.stats.queues.history?.length || 0} (${this.stats.queues.history?.status || 'UNKNOWN'})`,
      deadLetter: `${this.stats.queues.deadLetter?.length || 0} (${this.stats.queues.deadLetter?.status || 'UNKNOWN'})`
    });
    logger.info('MongoDB:', this.stats.mongodb.status, {
      responseTime: this.stats.mongodb.responseTime,
      connections: this.stats.mongodb.connections
    });
    logger.info('Redis:', this.stats.redis.status, {
      responseTime: this.stats.redis.responseTime,
      memory: this.stats.redis.memory
    });
    logger.info('System:', {
      uptime: this.stats.system.uptime,
      memory: this.stats.system.memory
    });
    logger.info('===========================');
  }

  getStats() {
    return this.stats;
  }

  stop() {
    logger.info('Stopping System Monitor...');
    this.isRunning = false;
  }
}

// Main execution
if (require.main === module) {
  const monitor = new SystemMonitor();

  // Setup event listeners
  monitor.on('alert', (alert) => {
    logger.warn('ALERT:', alert);
  });

  monitor.on('error', (error) => {
    logger.error('Monitor error:', error);
  });

  monitor.start().catch((error) => {
    logger.error('Fatal error starting System Monitor:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down monitor...');
    monitor.stop();
    await mongoDBConnection.close();
    await redisConnection.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down monitor...');
    monitor.stop();
    await mongoDBConnection.close();
    await redisConnection.disconnect();
    process.exit(0);
  });
}

module.exports = SystemMonitor;
