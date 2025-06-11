/**
 * @file validation-service.js
 * @description Validation service implementation for CLARITY_ENGINE
 * @version 1.0.0
 * @lastUpdated 2025-06-08T04:36:01Z
 */

const { Logger } = require('./logger');

class ValidationService {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('validation-service');
  }

  /**
   * Validate a concept
   * @param {Object} concept - The concept to validate
   * @returns {Promise<void>}
   */
  async validateConcept(concept) {
    try {
      this.logger.info('Validating concept', { conceptId: concept.id });
      
      // Validate required fields
      this.validateRequiredFields(concept, [
        'id',
        'type',
        'content'
      ]);
      
      // Validate field types
      this.validateFieldTypes(concept, {
        id: 'string',
        type: 'string',
        content: 'string',
        metadata: 'object'
      });
      
      // Validate field values
      this.validateFieldValues(concept);
      
      this.logger.info('Concept validated successfully', { 
        conceptId: concept.id 
      });
    } catch (error) {
      this.logger.error('Failed to validate concept', { 
        conceptId: concept.id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Validate a relationship
   * @param {Object} relationship - The relationship to validate
   * @returns {Promise<void>}
   */
  async validateRelationship(relationship) {
    try {
      this.logger.info('Validating relationship', { 
        relationshipId: relationship.id 
      });
      
      // Validate required fields
      this.validateRequiredFields(relationship, [
        'id',
        'type',
        'source',
        'target',
        'strength',
        'confidence'
      ]);
      
      // Validate field types
      this.validateFieldTypes(relationship, {
        id: 'string',
        type: 'string',
        source: 'string',
        target: 'string',
        strength: 'number',
        confidence: 'number',
        metadata: 'object'
      });
      
      // Validate field values
      this.validateFieldValues(relationship);
      
      this.logger.info('Relationship validated successfully', { 
        relationshipId: relationship.id 
      });
    } catch (error) {
      this.logger.error('Failed to validate relationship', { 
        relationshipId: relationship.id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Validate a cluster
   * @param {Object} cluster - The cluster to validate
   * @returns {Promise<void>}
   */
  async validateCluster(cluster) {
    try {
      this.logger.info('Validating cluster', { clusterId: cluster.id });
      
      // Validate required fields
      this.validateRequiredFields(cluster, [
        'id',
        'embeddings',
        'labels',
        'metadata'
      ]);
      
      // Validate field types
      this.validateFieldTypes(cluster, {
        id: 'string',
        embeddings: 'array',
        labels: 'array',
        metadata: 'object'
      });
      
      // Validate field values
      this.validateFieldValues(cluster);
      
      this.logger.info('Cluster validated successfully', { 
        clusterId: cluster.id 
      });
    } catch (error) {
      this.logger.error('Failed to validate cluster', { 
        clusterId: cluster.id,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Validate required fields
   * @param {Object} object - The object to validate
   * @param {Array<string>} fields - Array of required field names
   * @throws {Error} If any required field is missing
   * @private
   */
  validateRequiredFields(object, fields) {
    for (const field of fields) {
      if (!(field in object)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Validate field types
   * @param {Object} object - The object to validate
   * @param {Object} types - Object mapping field names to expected types
   * @throws {Error} If any field has incorrect type
   * @private
   */
  validateFieldTypes(object, types) {
    for (const [field, type] of Object.entries(types)) {
      if (field in object) {
        const value = object[field];
        const valueType = Array.isArray(value) ? 'array' : typeof value;
        
        if (valueType !== type) {
          throw new Error(
            `Invalid type for field ${field}: expected ${type}, got ${valueType}`
          );
        }
      }
    }
  }

  /**
   * Validate field values
   * @param {Object} object - The object to validate
   * @throws {Error} If any field has invalid value
   * @private
   */
  validateFieldValues(object) {
    // Validate ID format
    if (object.id && !this.isValidId(object.id)) {
      throw new Error(`Invalid ID format: ${object.id}`);
    }
    
    // Validate numeric ranges
    if ('strength' in object) {
      this.validateRange(object.strength, 0, 1, 'strength');
    }
    
    if ('confidence' in object) {
      this.validateRange(object.confidence, 0, 1, 'confidence');
    }
    
    // Validate array lengths
    if (Array.isArray(object.embeddings) && Array.isArray(object.labels)) {
      if (object.embeddings.length !== object.labels.length) {
        throw new Error(
          `Mismatched array lengths: embeddings (${object.embeddings.length}) ` +
          `!= labels (${object.labels.length})`
        );
      }
    }
  }

  /**
   * Validate a numeric range
   * @param {number} value - The value to validate
   * @param {number} min - The minimum allowed value
   * @param {number} max - The maximum allowed value
   * @param {string} field - The field name
   * @throws {Error} If the value is outside the allowed range
   * @private
   */
  validateRange(value, min, max, field) {
    if (value < min || value > max) {
      throw new Error(
        `Invalid ${field} value: ${value} (must be between ${min} and ${max})`
      );
    }
  }

  /**
   * Check if an ID is valid
   * @param {string} id - The ID to check
   * @returns {boolean} Whether the ID is valid
   * @private
   */
  isValidId(id) {
    // ID format: type-timestamp-random
    const pattern = /^[a-z]+-\d+-[a-z0-9]+$/;
    return pattern.test(id);
  }

  /**
   * Get health status of the validation service
   * @returns {Promise<Object>} Health status
   */
  async getHealth() {
    try {
      return {
        status: 'healthy',
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
  ValidationService
}; 