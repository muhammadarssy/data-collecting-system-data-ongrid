const Bottleneck = require('bottleneck');
const config = require('../config/config');
const mongoDBConnection = require('../database/mongodb');
const redisConnection = require('../database/redis');
const logger = require('../utils/logger');

class RealtimeWorker {
  constructor(workerId = 1) {
    this.workerId = workerId;
    this.isRunning = false;
    this.processedCount = 0;
    this.errorCount = 0;
    this.limiter = null;
    this.mongodb = null;
  }

  async start() {
    try {
      logger.info(`Realtime Worker #${this.workerId} starting...`);

      // Initialize MongoDB connection
      this.mongodb = await mongoDBConnection.connect();
      logger.info(`Realtime Worker #${this.workerId} connected to MongoDB`);

      // Initialize rate limiter
      this.limiter = new Bottleneck({
        maxConcurrent: config.rateLimit.maxConcurrent,
        minTime: config.rateLimit.minTime,
        reservoir: config.rateLimit.reservoir,
        reservoirRefreshAmount: config.rateLimit.reservoirRefreshAmount,
        reservoirRefreshInterval: config.rateLimit.reservoirRefreshInterval
      });

      logger.info(`Realtime Worker #${this.workerId} rate limiter initialized`);

      this.isRunning = true;
      this.startProcessing();

      // Start stats logger
      this.startStatsLogger();

    } catch (error) {
      logger.error(`Realtime Worker #${this.workerId} failed to start:`, error);
      process.exit(1);
    }
  }

  async startProcessing() {
    logger.info(`Realtime Worker #${this.workerId} processing queue...`);

    while (this.isRunning) {
      try {
        // Collect batch of messages
        const batch = [];
        const batchSize = config.worker.batchSizeRealtime;

        for (let i = 0; i < batchSize; i++) {
          const message = await redisConnection.popFromQueue(
            config.queue.realtimeName,
            1 // 1 second timeout
          );

          if (message) {
            batch.push(message);
          } else {
            break;
          }
        }

        if (batch.length > 0) {
          await this.processBatch(batch);
        } else {
          // No messages, wait a bit
          await this.sleep(500);
        }

      } catch (error) {
        logger.error(`Realtime Worker #${this.workerId} processing error:`, error);
        await this.sleep(2000);
      }
    }
  }

  async processBatch(batch) {
    try {
      // Group messages by database and collection
      const grouped = this.groupByCollection(batch);

      // Process each group with rate limiting
      await this.limiter.schedule(async () => {
        for (const [key, messages] of Object.entries(grouped)) {
          await this.upsertBatch(key, messages);
        }
      });

      this.processedCount += batch.length;

    } catch (error) {
      logger.error(`Realtime Worker #${this.workerId} batch processing error:`, error);
      this.errorCount += batch.length;
      
      // Send failed messages to dead letter queue
      await this.sendToDeadLetterQueue(batch, error.message);
    }
  }

  groupByCollection(messages) {
    return messages.reduce((acc, message) => {
      const key = `${message.database}|||${message.collection}`;
      
      if (!acc[key]) {
        acc[key] = {
          database: message.database,
          collection: message.collection,
          operations: []
        };
      }

      // Prepare update operation
      const operation = {
        message,
        filter: {
          gatewayId: message.idGateway,
          deviceId: message.payload.deviceId || message.idGateway
        },
        update: {
          $set: {
            ...message.payload,
            siteId: message.siteId,
            gatewayId: message.idGateway,
            lastUpdate: new Date(),
            receivedAt: new Date(message.receivedAt),
            processedAt: new Date()
          }
        }
      };

      acc[key].operations.push(operation);
      return acc;
    }, {});
  }

  async upsertBatch(key, group) {
    try {
      const { database, collection, operations } = group;

      const db = await mongoDBConnection.getDatabase(database);
      const coll = db.collection(collection);

      // Build bulk operations
      const bulkOps = operations.map(op => ({
        updateOne: {
          filter: op.filter,
          update: op.update,
          upsert: true
        }
      }));

      // Execute bulk write
      const result = await coll.bulkWrite(bulkOps, { 
        ordered: false,
        writeConcern: { w: 1 }
      });

      logger.debug(`Realtime Worker #${this.workerId} upserted:`, {
        database,
        collection,
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
        total: operations.length
      });

    } catch (error) {
      logger.error(`Realtime Worker #${this.workerId} upsert error:`, {
        database: group.database,
        collection: group.collection,
        error: error.message
      });
      throw error;
    }
  }

  async sendToDeadLetterQueue(messages, errorMessage) {
    try {
      for (const message of messages) {
        const dlqData = {
          ...message,
          error: errorMessage,
          failedAt: new Date().toISOString(),
          worker: `realtime-worker-${this.workerId}`
        };
        
        await redisConnection.pushToQueue(
          config.queue.deadLetterName,
          dlqData
        );
      }
      
      logger.warn(`Realtime Worker #${this.workerId} sent ${messages.length} messages to DLQ`);
    } catch (error) {
      logger.error(`Realtime Worker #${this.workerId} failed to send to DLQ:`, error);
    }
  }

  startStatsLogger() {
    setInterval(() => {
      logger.info(`Realtime Worker #${this.workerId} Stats:`, {
        processed: this.processedCount,
        errors: this.errorCount,
        running: this.isRunning
      });
    }, 60000); // Every minute
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    logger.info(`Realtime Worker #${this.workerId} stopping...`);
    this.isRunning = false;
  }
}

// Main execution
if (require.main === module) {
  const workerId = process.env.WORKER_ID || 1;
  const worker = new RealtimeWorker(workerId);

  worker.start().catch((error) => {
    logger.error(`Fatal error in Realtime Worker #${workerId}:`, error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    await worker.stop();
    await mongoDBConnection.close();
    await redisConnection.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await worker.stop();
    await mongoDBConnection.close();
    await redisConnection.disconnect();
    process.exit(0);
  });
}

module.exports = RealtimeWorker;
