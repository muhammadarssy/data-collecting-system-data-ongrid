require('dotenv').config();

module.exports = {
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    clientId: process.env.MQTT_CLIENT_ID || 'data-collector',
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
    topicPattern: process.env.MQTT_TOPIC_PATTERN || 'data/+/+/+/+/+',
    options: {
      clean: true,
      connectTimeout: 30000,
      reconnectPeriod: 5000,
      keepalive: 60
    }
  },

  mongodb: { 
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    options: {
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 50,
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE) || 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB) || 0,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3
  },

  queue: {
    realtimeName: process.env.QUEUE_REALTIME_NAME || 'queue:realtime',
    historyName: process.env.QUEUE_HISTORY_NAME || 'queue:history',
    deadLetterName: process.env.QUEUE_DEAD_LETTER_NAME || 'queue:dead_letter'
  },

  worker: {
    historyInstances: parseInt(process.env.WORKER_HISTORY_INSTANCES) || 4,
    realtimeInstances: parseInt(process.env.WORKER_REALTIME_INSTANCES) || 2,
    batchSizeHistory: parseInt(process.env.BATCH_SIZE_HISTORY) || 100,
    batchSizeRealtime: parseInt(process.env.BATCH_SIZE_REALTIME) || 50,
    batchIntervalMs: parseInt(process.env.BATCH_INTERVAL_MS) || 5000
  },

  rateLimit: {
    maxConcurrent: parseInt(process.env.RATE_LIMIT_MAX_CONCURRENT) || 10,
    minTime: parseInt(process.env.RATE_LIMIT_MIN_TIME_MS) || 100,
    reservoir: parseInt(process.env.RATE_LIMIT_RESERVOIR) || 1000,
    reservoirRefreshAmount: parseInt(process.env.RATE_LIMIT_RESERVOIR) || 1000,
    reservoirRefreshInterval: parseInt(process.env.RATE_LIMIT_RESERVOIR_REFRESH_INTERVAL_MS) || 60000
  },

  monitoring: {
    intervalMs: parseInt(process.env.MONITOR_INTERVAL_MS) || 30000,
    queueAlertThreshold: {
      history: parseInt(process.env.QUEUE_ALERT_THRESHOLD_HISTORY) || 50000,
      realtime: parseInt(process.env.QUEUE_ALERT_THRESHOLD_REALTIME) || 10000
    }
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs/app.log'
  },

  messageFormatting: {
    // Parse comma-separated prefixes from env
    keyPrefixes: process.env.MESSAGE_KEY_PREFIXES 
      ? process.env.MESSAGE_KEY_PREFIXES.split(',').map(p => p.trim())
      : ['INV_1_', 'INV_2_', 'INV_3_', 'INV_4_', 'CHINT_1_', 'CHINT_2_', 'CHINT_3_', 'CHINT_4_']
  }
};
