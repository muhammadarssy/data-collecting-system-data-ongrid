const config = require('../config/config');
const mongoDBConnection = require('../database/mongodb');
const redisConnection = require('../database/redis');
const logger = require('../utils/logger');

class DLQHistoryWorker {
  constructor(workerId = 1) {
    this.workerId = workerId;
    this.isRunning = false;
    this.retriedCount = 0;
    this.skippedCount = 0;
    this.checkIntervalMs = config.worker.dlqCheckIntervalMs;
  }

  async start() {
    try {
      logger.info(`DLQ History Worker #${this.workerId} starting...`);

      await mongoDBConnection.connect();
      redisConnection.getClient();

      this.isRunning = true;
      this.startProcessing();
      this.startStatsLogger();

      logger.info(`DLQ History Worker #${this.workerId} started, check interval: ${this.checkIntervalMs}ms`);
    } catch (error) {
      logger.error(`DLQ History Worker #${this.workerId} failed to start:`, error);
      process.exit(1);
    }
  }

  async startProcessing() {
    logger.info(`DLQ History Worker #${this.workerId} watching queue:dead_letter...`);

    while (this.isRunning) {
      try {
        const dlqLength = await redisConnection.getQueueLength(config.queue.deadLetterName);

        if (dlqLength === 0) {
          await this.sleep(this.checkIntervalMs);
          continue;
        }

        const mongodbAvailable = await this.checkMongoDB();

        if (!mongodbAvailable) {
          logger.warn(`DLQ History Worker #${this.workerId}: MongoDB unavailable, waiting to retry...`);
          await this.sleep(this.checkIntervalMs);
          continue;
        }

        logger.info(`DLQ History Worker #${this.workerId}: Found ${dlqLength} messages in DLQ, processing...`);
        await this.processDLQ(dlqLength);

      } catch (error) {
        logger.error(`DLQ History Worker #${this.workerId} processing error:`, error);
        await this.sleep(this.checkIntervalMs);
      }
    }
  }

  async processDLQ(totalMessages) {
    let historyRetried = 0;
    let realtimeSkipped = 0;

    for (let i = 0; i < totalMessages; i++) {
      if (!this.isRunning) break;

      const message = await redisConnection.popFromQueue(config.queue.deadLetterName, 1);

      if (!message) break;

      const isHistory = message.dataType === 'history' ||
        (message.worker && message.worker.startsWith('history-worker'));

      if (isHistory) {
        // Strip DLQ-specific fields before re-queuing
        const { error, failedAt, worker, ...originalMessage } = message;

        const success = await redisConnection.pushToQueue(config.queue.historyName, originalMessage);

        if (success) {
          historyRetried++;
          this.retriedCount++;
          logger.debug(`DLQ History Worker #${this.workerId}: Requeued history message`, {
            siteId: message.siteId,
            database: message.database,
            collection: message.collection,
            originalError: error
          });
        } else {
          // Failed to push to history queue, return to DLQ
          await redisConnection.pushToQueue(config.queue.deadLetterName, message);
          logger.warn(`DLQ History Worker #${this.workerId}: Failed to requeue, returned to DLQ`);
        }
      } else {
        // Realtime message, put back in DLQ untouched
        await redisConnection.pushToQueue(config.queue.deadLetterName, message);
        realtimeSkipped++;
        this.skippedCount++;
      }
    }

    if (historyRetried > 0 || realtimeSkipped > 0) {
      logger.info(`DLQ History Worker #${this.workerId}: Batch done`, {
        historyRetried,
        realtimeSkipped
      });
    }
  }

  async checkMongoDB() {
    try {
      await mongoDBConnection.connect();
      await mongoDBConnection.getClient().db('admin').command({ ping: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  startStatsLogger() {
    setInterval(() => {
      logger.info(`DLQ History Worker #${this.workerId} Stats:`, {
        totalRetried: this.retriedCount,
        totalRealtimeSkipped: this.skippedCount,
        running: this.isRunning
      });
    }, 60000);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    logger.info(`DLQ History Worker #${this.workerId} stopping...`);
    this.isRunning = false;
  }
}

// Main execution
if (require.main === module) {
  const workerId = process.env.WORKER_ID || 1;
  const worker = new DLQHistoryWorker(workerId);

  worker.start().catch((error) => {
    logger.error(`Fatal error in DLQ History Worker #${workerId}:`, error);
    process.exit(1);
  });

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

module.exports = DLQHistoryWorker;
