const { MongoClient } = require('mongodb');
const config = require('../config/config');
const logger = require('../utils/logger');

class MongoDBConnection {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      if (this.isConnected && this.client) {
        return this.client;
      }

      logger.info('Connecting to MongoDB...', { uri: config.mongodb.uri });
      
      this.client = new MongoClient(config.mongodb.uri, config.mongodb.options);
      await this.client.connect();
      
      // Test connection
      await this.client.db('admin').command({ ping: 1 });
      
      this.isConnected = true;
      logger.info('MongoDB connected successfully');
      
      return this.client;
    } catch (error) {
      logger.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async getDatabase(dbName) {
    if (!this.isConnected) {
      await this.connect();
    }
    return this.client.db(dbName);
  }

  async getCollection(dbName, collectionName) {
    const db = await this.getDatabase(dbName);
    return db.collection(collectionName);
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      logger.info('MongoDB connection closed');
    }
  }

  getClient() {
    return this.client;
  }
}

// Singleton instance
const mongoDBConnection = new MongoDBConnection();

module.exports = mongoDBConnection;
