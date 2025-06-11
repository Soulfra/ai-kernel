/**
 * @file embedding-service.js
 * @description Embedding service implementation for CLARITY_ENGINE
 * @version 1.0.0
 * @lastUpdated 2025-06-08T04:36:01Z
 */

const { Configuration, OpenAIApi } = require('openai');
const { Logger } = require('./logger');

class EmbeddingService {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('embedding-service');
    this.client = null;
  }

  /**
   * Initialize the embedding service
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.logger.info('Initializing embedding service');
      
      // Create OpenAI client
      const configuration = new Configuration({
        apiKey: this.config.apiKey
      });
      
      this.client = new OpenAIApi(configuration);
      
      this.logger.info('Embedding service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize embedding service', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Generate embedding for a concept
   * @param {Object} concept - The concept to generate embedding for
   * @returns {Promise<Array<number>>} The generated embedding
   */
  async generateEmbedding(concept) {
    try {
      this.logger.info('Generating embedding', { conceptId: concept.id });
      
      // Ensure embedding service is initialized
      if (!this.client) {
        await this.initialize();
      }
      
      // Prepare text for embedding
      const text = this.prepareText(concept);
      
      // Generate embedding
      const response = await this.client.createEmbedding({
        model: this.config.model,
        input: text
      });
      
      const embedding = response.data.data[0].embedding;
      
      this.logger.info('Embedding generated successfully', { 
        conceptId: concept.id,
        dimensions: embedding.length 
      });
      
      return embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding', { 
        conceptId: concept.id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple concepts
   * @param {Array<Object>} concepts - Array of concepts to generate embeddings for
   * @returns {Promise<Array<Array<number>>>} Array of generated embeddings
   */
  async generateEmbeddings(concepts) {
    try {
      this.logger.info('Generating embeddings', { 
        conceptCount: concepts.length 
      });
      
      // Ensure embedding service is initialized
      if (!this.client) {
        await this.initialize();
      }
      
      // Prepare texts for embedding
      const texts = concepts.map(concept => this.prepareText(concept));
      
      // Generate embeddings
      const response = await this.client.createEmbedding({
        model: this.config.model,
        input: texts
      });
      
      const embeddings = response.data.data.map(item => item.embedding);
      
      this.logger.info('Embeddings generated successfully', { 
        conceptCount: concepts.length,
        dimensions: embeddings[0].length 
      });
      
      return embeddings;
    } catch (error) {
      this.logger.error('Failed to generate embeddings', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Prepare text for embedding
   * @param {Object} concept - The concept to prepare text for
   * @returns {string} The prepared text
   * @private
   */
  prepareText(concept) {
    // Combine relevant fields
    const fields = [
      concept.type,
      concept.content,
      ...Object.entries(concept.metadata || {})
        .map(([key, value]) => `${key}: ${value}`)
    ];
    
    // Join fields with newlines
    return fields.join('\n');
  }

  /**
   * Get health status of the embedding service
   * @returns {Promise<Object>} Health status
   */
  async getHealth() {
    try {
      // Ensure embedding service is initialized
      if (!this.client) {
        await this.initialize();
      }
      
      // Test embedding generation
      const testEmbedding = await this.generateEmbedding({
        id: 'health-check',
        type: 'test',
        content: 'Health check',
        metadata: {
          timestamp: new Date().toISOString()
        }
      });
      
      return {
        status: 'healthy',
        stats: {
          dimensions: testEmbedding.length,
          model: this.config.model
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
  EmbeddingService
}; 