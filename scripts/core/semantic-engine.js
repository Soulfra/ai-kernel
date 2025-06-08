/**
 * @file semantic-engine.js
 * @description Core semantic engine implementation for CLARITY_ENGINE
 * @version 1.0.0
 * @lastUpdated 2025-06-08T04:36:01Z
 */

const { VectorStore } = require('./vector-store');
const { GraphStore } = require('./graph-store');
const { EmbeddingService } = require('./embedding-service');
const { ClusteringService } = require('./clustering-service');
const { RelationshipManager } = require('./relationship-manager');
const { ValidationService } = require('./validation-service');
const { Logger } = require('./logger');

class SemanticEngine {
  constructor(config) {
    this.config = config;
    this.vectorStore = new VectorStore(config.vectorStore);
    this.graphStore = new GraphStore(config.graphStore);
    this.embeddingService = new EmbeddingService(config.embedding);
    this.clusteringService = new ClusteringService(config.clustering);
    this.relationshipManager = new RelationshipManager(config.relationship);
    this.validationService = new ValidationService(config.validation);
    this.logger = new Logger('semantic-engine');
  }

  /**
   * Add a concept to the semantic engine
   * @param {Object} concept - The concept to add
   * @returns {Promise<void>}
   */
  async addConcept(concept) {
    try {
      this.logger.info('Adding concept', { conceptId: concept.id });
      
      // Validate concept
      await this.validationService.validateConcept(concept);
      
      // Generate embedding
      const embedding = await this.embeddingService.generateEmbedding(concept);
      
      // Store in vector store
      await this.vectorStore.store(concept.id, embedding);
      
      // Update relationships
      await this.relationshipManager.updateRelationships(concept);
      
      this.logger.info('Concept added successfully', { conceptId: concept.id });
    } catch (error) {
      this.logger.error('Failed to add concept', { 
        conceptId: concept.id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Find concepts related to the given concept
   * @param {Object} concept - The concept to find related concepts for
   * @returns {Promise<Array>} Array of related concepts
   */
  async findRelated(concept) {
    try {
      this.logger.info('Finding related concepts', { conceptId: concept.id });
      
      // Generate embedding
      const embedding = await this.embeddingService.generateEmbedding(concept);
      
      // Find similar concepts
      const similar = await this.vectorStore.findSimilar(embedding);
      
      // Get related concepts
      const related = await this.relationshipManager.getRelatedConcepts(similar);
      
      this.logger.info('Found related concepts', { 
        conceptId: concept.id,
        count: related.length 
      });
      
      return related;
    } catch (error) {
      this.logger.error('Failed to find related concepts', { 
        conceptId: concept.id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Add a relationship between concepts
   * @param {Object} relationship - The relationship to add
   * @returns {Promise<void>}
   */
  async addRelationship(relationship) {
    try {
      this.logger.info('Adding relationship', { 
        relationshipId: relationship.id,
        source: relationship.source,
        target: relationship.target
      });
      
      // Validate relationship
      await this.validationService.validateRelationship(relationship);
      
      // Add to graph store
      await this.graphStore.addRelationship(relationship);
      
      // Update relationship manager
      await this.relationshipManager.updateRelationship(relationship);
      
      this.logger.info('Relationship added successfully', { 
        relationshipId: relationship.id 
      });
    } catch (error) {
      this.logger.error('Failed to add relationship', { 
        relationshipId: relationship.id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Create a cluster of concepts
   * @param {Array} concepts - Array of concepts to cluster
   * @returns {Promise<Object>} The created cluster
   */
  async createCluster(concepts) {
    try {
      this.logger.info('Creating cluster', { conceptCount: concepts.length });
      
      // Validate concepts
      await Promise.all(concepts.map(c => 
        this.validationService.validateConcept(c)
      ));
      
      // Generate embeddings
      const embeddings = await Promise.all(concepts.map(c =>
        this.embeddingService.generateEmbedding(c)
      ));
      
      // Create cluster
      const cluster = await this.clusteringService.createCluster(embeddings);
      
      // Update relationships
      await this.relationshipManager.updateClusterRelationships(cluster);
      
      this.logger.info('Cluster created successfully', { 
        clusterId: cluster.id,
        conceptCount: concepts.length 
      });
      
      return cluster;
    } catch (error) {
      this.logger.error('Failed to create cluster', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Merge multiple clusters
   * @param {Array} clusterIds - Array of cluster IDs to merge
   * @returns {Promise<Object>} The merged cluster
   */
  async mergeClusters(clusterIds) {
    try {
      this.logger.info('Merging clusters', { clusterIds });
      
      // Get clusters
      const clusters = await Promise.all(clusterIds.map(id =>
        this.clusteringService.getCluster(id)
      ));
      
      // Validate clusters
      await Promise.all(clusters.map(c => 
        this.validationService.validateCluster(c)
      ));
      
      // Merge clusters
      const merged = await this.clusteringService.mergeClusters(clusters);
      
      // Update relationships
      await this.relationshipManager.updateClusterRelationships(merged);
      
      this.logger.info('Clusters merged successfully', { 
        mergedClusterId: merged.id,
        sourceClusterIds: clusterIds 
      });
      
      return merged;
    } catch (error) {
      this.logger.error('Failed to merge clusters', { 
        clusterIds,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get health status of the semantic engine
   * @returns {Promise<Object>} Health status
   */
  async getHealth() {
    try {
      const vectorHealth = await this.vectorStore.getHealth();
      const graphHealth = await this.graphStore.getHealth();
      const embeddingHealth = await this.embeddingService.getHealth();
      const clusteringHealth = await this.clusteringService.getHealth();
      
      return {
        status: 'healthy',
        components: {
          vectorStore: vectorHealth,
          graphStore: graphHealth,
          embeddingService: embeddingHealth,
          clusteringService: clusteringHealth
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
  SemanticEngine
}; 