/**
 * @file graph-store.js
 * @description Graph store implementation for CLARITY_ENGINE
 * @version 1.0.0
 * @lastUpdated 2025-06-08T04:36:01Z
 */

const neo4j = require('neo4j-driver');
const { Logger } = require('./logger');

class GraphStore {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('graph-store');
    this.driver = null;
    this.session = null;
  }

  /**
   * Initialize the graph store
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.logger.info('Initializing graph store');
      
      // Create Neo4j driver
      this.driver = neo4j.driver(
        this.config.uri,
        neo4j.auth.basic(this.config.username, this.config.password)
      );
      
      // Create session
      this.session = this.driver.session({
        database: this.config.database
      });
      
      // Verify connection
      await this.session.run('RETURN 1');
      
      this.logger.info('Graph store initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize graph store', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Create a relationship between nodes
   * @param {Object} relationship - The relationship to create
   * @returns {Promise<void>}
   */
  async createRelationship(relationship) {
    try {
      this.logger.info('Creating relationship', { 
        relationshipId: relationship.id,
        source: relationship.source,
        target: relationship.target
      });
      
      // Ensure graph store is initialized
      if (!this.session) {
        await this.initialize();
      }
      
      // Create relationship
      await this.session.run(
        `
        MATCH (source {id: $sourceId})
        MATCH (target {id: $targetId})
        MERGE (source)-[r:${relationship.type} {
          id: $relationshipId,
          strength: $strength,
          confidence: $confidence,
          metadata: $metadata,
          created: datetime()
        }]->(target)
        `,
        {
          sourceId: relationship.source,
          targetId: relationship.target,
          relationshipId: relationship.id,
          strength: relationship.strength,
          confidence: relationship.confidence,
          metadata: relationship.metadata
        }
      );
      
      this.logger.info('Relationship created successfully', { 
        relationshipId: relationship.id 
      });
    } catch (error) {
      this.logger.error('Failed to create relationship', { 
        relationshipId: relationship.id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get relationships for a node
   * @param {string} nodeId - The ID of the node
   * @returns {Promise<Array>} Array of relationships
   */
  async getRelationships(nodeId) {
    try {
      this.logger.info('Getting relationships', { nodeId });
      
      // Ensure graph store is initialized
      if (!this.session) {
        await this.initialize();
      }
      
      // Get relationships
      const result = await this.session.run(
        `
        MATCH (n {id: $nodeId})-[r]->(m)
        RETURN r, m
        `,
        { nodeId }
      );
      
      // Transform results
      const relationships = result.records.map(record => {
        const rel = record.get('r');
        const target = record.get('m');
        
        return {
          id: rel.properties.id,
          type: rel.type,
          source: nodeId,
          target: target.properties.id,
          strength: rel.properties.strength,
          confidence: rel.properties.confidence,
          metadata: rel.properties.metadata
        };
      });
      
      this.logger.info('Got relationships', { 
        nodeId,
        count: relationships.length 
      });
      
      return relationships;
    } catch (error) {
      this.logger.error('Failed to get relationships', { 
        nodeId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Delete a relationship
   * @param {string} relationshipId - The ID of the relationship to delete
   * @returns {Promise<void>}
   */
  async deleteRelationship(relationshipId) {
    try {
      this.logger.info('Deleting relationship', { relationshipId });
      
      // Ensure graph store is initialized
      if (!this.session) {
        await this.initialize();
      }
      
      // Delete relationship
      await this.session.run(
        `
        MATCH ()-[r {id: $relationshipId}]->()
        DELETE r
        `,
        { relationshipId }
      );
      
      this.logger.info('Relationship deleted successfully', { 
        relationshipId 
      });
    } catch (error) {
      this.logger.error('Failed to delete relationship', { 
        relationshipId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get health status of the graph store
   * @returns {Promise<Object>} Health status
   */
  async getHealth() {
    try {
      // Ensure graph store is initialized
      if (!this.session) {
        await this.initialize();
      }
      
      // Get database stats
      const result = await this.session.run(
        `
        CALL db.stats.retrieve('GRAPH COUNTS')
        YIELD value
        RETURN value
        `
      );
      
      const stats = result.records[0].get('value');
      
      return {
        status: 'healthy',
        stats: {
          nodes: stats.nodes,
          relationships: stats.relationships,
          labels: stats.labels,
          relationshipTypes: stats.relationshipTypes
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

  /**
   * Close the graph store connection
   * @returns {Promise<void>}
   */
  async close() {
    try {
      if (this.session) {
        await this.session.close();
      }
      if (this.driver) {
        await this.driver.close();
      }
      this.logger.info('Graph store connection closed');
    } catch (error) {
      this.logger.error('Failed to close graph store connection', { 
        error: error.message 
      });
      throw error;
    }
  }
}

module.exports = {
  GraphStore
}; 