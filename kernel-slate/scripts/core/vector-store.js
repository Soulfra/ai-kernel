/**
 * @file vector-store.js
 * @description Vector store implementation for CLARITY_ENGINE
 * @version 1.0.0
 * @lastUpdated 2025-06-08T04:36:01Z
 */

const { PineconeClient } = require('@pinecone-database/pinecone');
const { Logger } = require('./logger');

class VectorStore {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('vector-store');
    this.client = null;
    this.index = null;
  }

  /**
   * Initialize the vector store
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.logger.info('Initializing vector store');
      
      // Initialize Pinecone client
      this.client = new PineconeClient();
      await this.client.init({
        apiKey: this.config.apiKey,
        environment: this.config.environment
      });
      
      // Get index
      this.index = this.client.Index(this.config.index);
      
      this.logger.info('Vector store initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize vector store', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Store a vector in the vector store
   * @param {string} id - The ID of the vector
   * @param {Array<number>} vector - The vector to store
   * @returns {Promise<void>}
   */
  async store(id, vector) {
    try {
      this.logger.info('Storing vector', { id });
      
      // Ensure vector store is initialized
      if (!this.index) {
        await this.initialize();
      }
      
      // Store vector
      await this.index.upsert({
        vectors: [{
          id,
          values: vector,
          metadata: {
            timestamp: new Date().toISOString()
          }
        }]
      });
      
      this.logger.info('Vector stored successfully', { id });
    } catch (error) {
      this.logger.error('Failed to store vector', { 
        id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Find similar vectors
   * @param {Array<number>} vector - The vector to find similar vectors for
   * @param {Object} options - Query options
   * @returns {Promise<Array<string>>} Array of similar vector IDs
   */
  async findSimilar(vector, options = {}) {
    try {
      this.logger.info('Finding similar vectors', { 
        limit: options.limit || 10 
      });
      
      // Ensure vector store is initialized
      if (!this.index) {
        await this.initialize();
      }
      
      // Query similar vectors
      const results = await this.index.query({
        vector,
        topK: options.limit || 10,
        includeMetadata: true
      });
      
      // Extract IDs
      const similarIds = results.matches.map(match => match.id);
      
      this.logger.info('Found similar vectors', { 
        count: similarIds.length 
      });
      
      return similarIds;
    } catch (error) {
      this.logger.error('Failed to find similar vectors', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Delete a vector from the vector store
   * @param {string} id - The ID of the vector to delete
   * @returns {Promise<void>}
   */
  async delete(id) {
    try {
      this.logger.info('Deleting vector', { id });
      
      // Ensure vector store is initialized
      if (!this.index) {
        await this.initialize();
      }
      
      // Delete vector
      await this.index.delete({
        ids: [id]
      });
      
      this.logger.info('Vector deleted successfully', { id });
    } catch (error) {
      this.logger.error('Failed to delete vector', { 
        id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get health status of the vector store
   * @returns {Promise<Object>} Health status
   */
  async getHealth() {
    try {
      // Ensure vector store is initialized
      if (!this.index) {
        await this.initialize();
      }
      
      // Get index stats
      const stats = await this.index.describeIndexStats();
      
      return {
        status: 'healthy',
        stats: {
          totalVectors: stats.totalVectorCount,
          dimension: stats.dimension,
          indexName: stats.indexName
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Health check failed', { error: error.message });
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = {
  VectorStore
}; 