const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('../config/config');
const redisConnection = require('../database/redis');
const mongoDBConnection = require('../database/mongodb');
const logger = require('../utils/logger');

class HealthDashboard {
  constructor(port = 3000) {
    this.app = express();
    this.port = port;
    this.stats = {
      system: {},
      mongodb: {},
      redis: {},
      queues: {},
      mqtt: {},
      lastUpdate: null
    };
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
  }

  setupRoutes() {
    // Serve dashboard HTML
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    });

    // API: Get all health stats
    this.app.get('/api/health', async (req, res) => {
      try {
        await this.updateStats();
        res.json({
          success: true,
          data: this.stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Health API error:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // API: Get queue stats only
    this.app.get('/api/queues', async (req, res) => {
      try {
        const queues = await this.getQueueStats();
        res.json({
          success: true,
          data: queues
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // API: Get MongoDB stats
    this.app.get('/api/mongodb', async (req, res) => {
      try {
        const mongodb = await this.getMongoDBStats();
        res.json({
          success: true,
          data: mongodb
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // API: Get Redis stats
    this.app.get('/api/redis', async (req, res) => {
      try {
        const redis = await this.getRedisStats();
        res.json({
          success: true,
          data: redis
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // API: Clear queue (admin action)
    this.app.post('/api/queue/clear/:queueName', async (req, res) => {
      try {
        const { queueName } = req.params;
        const redis = redisConnection.getClient();
        const deleted = await redis.del(queueName);
        
        logger.warn(`Queue ${queueName} cleared manually`, { deleted });
        
        res.json({
          success: true,
          message: `Queue ${queueName} cleared`,
          deleted
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });
  }

  async updateStats() {
    this.stats.queues = await this.getQueueStats();
    this.stats.mongodb = await this.getMongoDBStats();
    this.stats.redis = await this.getRedisStats();
    this.stats.system = this.getSystemStats();
    this.stats.lastUpdate = new Date().toISOString();
  }

  async getQueueStats() {
    try {
      const realtimeLength = await redisConnection.getQueueLength(config.queue.realtimeName);
      const historyLength = await redisConnection.getQueueLength(config.queue.historyName);
      const deadLetterLength = await redisConnection.getQueueLength(config.queue.deadLetterName);

      return {
        realtime: {
          name: config.queue.realtimeName,
          length: realtimeLength,
          threshold: config.monitoring.queueAlertThreshold.realtime,
          status: realtimeLength > config.monitoring.queueAlertThreshold.realtime ? 'WARNING' : 'OK',
          percentage: Math.min((realtimeLength / config.monitoring.queueAlertThreshold.realtime) * 100, 100)
        },
        history: {
          name: config.queue.historyName,
          length: historyLength,
          threshold: config.monitoring.queueAlertThreshold.history,
          status: historyLength > config.monitoring.queueAlertThreshold.history ? 'WARNING' : 'OK',
          percentage: Math.min((historyLength / config.monitoring.queueAlertThreshold.history) * 100, 100)
        },
        deadLetter: {
          name: config.queue.deadLetterName,
          length: deadLetterLength,
          status: deadLetterLength > 0 ? 'WARNING' : 'OK'
        }
      };
    } catch (error) {
      logger.error('Queue stats error:', error);
      return { status: 'ERROR', error: error.message };
    }
  }

  async getMongoDBStats() {
    try {
      const client = mongoDBConnection.getClient();
      
      if (!client) {
        return { status: 'DISCONNECTED' };
      }

      const startTime = Date.now();
      await client.db('admin').command({ ping: 1 });
      const responseTime = Date.now() - startTime;

      const serverStatus = await client.db('admin').command({ serverStatus: 1 });

      return {
        status: 'CONNECTED',
        responseTime: responseTime,
        connections: {
          current: serverStatus.connections?.current || 0,
          available: serverStatus.connections?.available || 0,
          totalCreated: serverStatus.connections?.totalCreated || 0
        },
        opcounters: {
          insert: serverStatus.opcounters?.insert || 0,
          query: serverStatus.opcounters?.query || 0,
          update: serverStatus.opcounters?.update || 0,
          delete: serverStatus.opcounters?.delete || 0
        },
        memory: {
          resident: serverStatus.mem?.resident || 0,
          virtual: serverStatus.mem?.virtual || 0
        },
        network: {
          bytesIn: serverStatus.network?.bytesIn || 0,
          bytesOut: serverStatus.network?.bytesOut || 0
        }
      };
    } catch (error) {
      logger.error('MongoDB stats error:', error);
      return { 
        status: 'ERROR',
        error: error.message 
      };
    }
  }

  async getRedisStats() {
    try {
      const redis = redisConnection.getClient();
      
      if (!redis) {
        return { status: 'DISCONNECTED' };
      }

      const startTime = Date.now();
      await redis.ping();
      const responseTime = Date.now() - startTime;

      const info = await redis.info();
      const infoObj = this.parseRedisInfo(info);

      return {
        status: 'CONNECTED',
        responseTime: responseTime,
        memory: {
          used: infoObj.used_memory_human || 'N/A',
          peak: infoObj.used_memory_peak_human || 'N/A',
          usedBytes: parseInt(infoObj.used_memory) || 0
        },
        clients: {
          connected: parseInt(infoObj.connected_clients) || 0,
          blocked: parseInt(infoObj.blocked_clients) || 0
        },
        stats: {
          totalConnections: parseInt(infoObj.total_connections_received) || 0,
          totalCommands: parseInt(infoObj.total_commands_processed) || 0,
          opsPerSec: parseInt(infoObj.instantaneous_ops_per_sec) || 0
        },
        keyspace: infoObj.db0 || 'N/A'
      };
    } catch (error) {
      logger.error('Redis stats error:', error);
      return { 
        status: 'ERROR',
        error: error.message 
      };
    }
  }

  parseRedisInfo(info) {
    const lines = info.split('\r\n');
    const obj = {};
    
    lines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        obj[key] = value;
      }
    });
    
    return obj;
  }

  getSystemStats() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: uptime,
      uptimeFormatted: this.formatUptime(uptime),
      memory: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      },
      cpu: process.cpuUsage()
    };
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }

  async start() {
    try {
      // Initialize connections
      await mongoDBConnection.connect();
      redisConnection.connect();

      // Setup express
      this.setupMiddleware();
      this.setupRoutes();

      // Start server
      this.app.listen(this.port, () => {
        logger.info(`Health Dashboard started on http://localhost:${this.port}`);
        console.log(`\n${'='.repeat(60)}`);
        console.log(`🏥 Health Monitor Dashboard`);
        console.log(`${'='.repeat(60)}`);
        console.log(`📊 Dashboard: http://localhost:${this.port}`);
        console.log(`🔌 API Endpoint: http://localhost:${this.port}/api/health`);
        console.log(`${'='.repeat(60)}\n`);
      });

      // Update stats periodically
      setInterval(() => {
        this.updateStats().catch(err => {
          logger.error('Stats update error:', err);
        });
      }, 5000); // Update every 5 seconds

    } catch (error) {
      logger.error('Failed to start Health Dashboard:', error);
      throw error;
    }
  }
}

// Main execution
if (require.main === module) {
  const port = process.env.DASHBOARD_PORT || 3000;
  const dashboard = new HealthDashboard(port);

  dashboard.start().catch((error) => {
    logger.error('Fatal error starting Health Dashboard:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down dashboard...');
    await mongoDBConnection.close();
    await redisConnection.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down dashboard...');
    await mongoDBConnection.close();
    await redisConnection.disconnect();
    process.exit(0);
  });
}

module.exports = HealthDashboard;
