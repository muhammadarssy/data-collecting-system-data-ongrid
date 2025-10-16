const mqtt = require('mqtt');
const config = require('./config/config');
const redisConnection = require('./database/redis');
const logger = require('./utils/logger');

class MQTTSubscriber {
  constructor() {
    this.client = null;
    this.redis = null;
    this.messageCount = {
      realtime: 0,
      history: 0,
      total: 0
    };
  }

  async start() {
    try {
      // Initialize Redis connection
      this.redis = redisConnection.getClient();
      logger.info('Redis client initialized for MQTT Subscriber');

      // Connect to MQTT Broker
      await this.connectMQTT();

      // Setup periodic stats logging
      this.startStatsLogger();

    } catch (error) {
      logger.error('Failed to start MQTT Subscriber:', error);
      process.exit(1);
    }
  }

  async connectMQTT() {
    return new Promise((resolve, reject) => {
      logger.info('Connecting to MQTT Broker...', { url: config.mqtt.brokerUrl });

      const mqttOptions = {
        ...config.mqtt.options,
        clientId: `${config.mqtt.clientId}_subscriber_${Date.now()}`
      };

      if (config.mqtt.username) {
        mqttOptions.username = config.mqtt.username;
        mqttOptions.password = config.mqtt.password;
      }

      this.client = mqtt.connect(config.mqtt.brokerUrl, mqttOptions);

      this.client.on('connect', () => {
        logger.info('MQTT Broker connected successfully');
        this.subscribeToTopics();
        resolve();
      });

      this.client.on('error', (error) => {
        logger.error('MQTT connection error:', error);
        reject(error);
      });

      this.client.on('message', this.handleMessage.bind(this));

      this.client.on('reconnect', () => {
        logger.warn('MQTT reconnecting...');
      });

      this.client.on('offline', () => {
        logger.warn('MQTT client offline');
      });

      this.client.on('close', () => {
        logger.warn('MQTT connection closed');
      });
    });
  }

  subscribeToTopics() {
    const topic = config.mqtt.topicPattern;
    
    this.client.subscribe(topic, { qos: 1 }, (error, granted) => {
      if (error) {
        logger.error('MQTT subscription error:', error);
        return;
      }
      
      logger.info('Subscribed to MQTT topics:', { 
        topic, 
        qos: granted[0].qos 
      });
    });
  }

  async handleMessage(topic, message) {
    try {
      // Parse topic: data/:site_id/realtime|history/:database/:collection/:idGateway
      const topicParts = topic.split('/');
      
      if (topicParts.length !== 6 || topicParts[0] !== 'data') {
        logger.warn('Invalid topic format:', { topic });
        return;
      }

      const [, siteId, dataType, database, collection, idGateway] = topicParts;

      // Validate data type
      if (dataType !== 'realtime' && dataType !== 'history') {
        logger.warn('Invalid data type in topic:', { topic, dataType });
        return;
      }

      // Parse message payload
      let payload;
      try {
        payload = JSON.parse(message.toString());
      } catch (parseError) {
        logger.error('Failed to parse message payload:', { 
          topic, 
          error: parseError.message 
        });
        return;
      }

      // Prepare data for queue
      const queueData = {
        topic,
        siteId,
        dataType,
        database,
        collection,
        idGateway,
        payload,
        timestamp: Date.now(),
        receivedAt: new Date().toISOString()
      };

      // Determine queue name based on data type
      const queueName = dataType === 'realtime' 
        ? config.queue.realtimeName 
        : config.queue.historyName;

      // Push to Redis queue
      const success = await redisConnection.pushToQueue(queueName, queueData);

      if (success) {
        this.messageCount[dataType]++;
        this.messageCount.total++;
        
        if (this.messageCount.total % 100 === 0) {
          logger.debug('Messages queued:', { 
            realtime: this.messageCount.realtime,
            history: this.messageCount.history,
            total: this.messageCount.total
          });
        }
      } else {
        logger.error('Failed to queue message:', { topic, queueName });
      }

    } catch (error) {
      logger.error('Error handling MQTT message:', { 
        topic, 
        error: error.message,
        stack: error.stack
      });
    }
  }

  startStatsLogger() {
    setInterval(() => {
      logger.info('MQTT Subscriber Stats:', {
        messagesReceived: this.messageCount,
        mqttConnected: this.client?.connected || false
      });
    }, 60000); // Every minute
  }

  async stop() {
    logger.info('Stopping MQTT Subscriber...');
    
    if (this.client) {
      this.client.end(true);
    }
    
    logger.info('MQTT Subscriber stopped');
  }
}

// Main execution
if (require.main === module) {
  const subscriber = new MQTTSubscriber();

  subscriber.start().catch((error) => {
    logger.error('Fatal error starting MQTT Subscriber:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    await subscriber.stop();
    await redisConnection.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await subscriber.stop();
    await redisConnection.disconnect();
    process.exit(0);
  });
}

module.exports = MQTTSubscriber;
