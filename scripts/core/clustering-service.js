/**
 * @file clustering-service.js
 * @description Clustering service implementation for CLARITY_ENGINE
 * @version 1.0.0
 * @lastUpdated 2025-06-08T04:36:01Z
 */

const hdbscan = require('hdbscan');
const { Logger } = require('./logger');

class ClusteringService {
  constructor(config) {
    this.config = config;
    this.logger = new Logger('clustering-service');
    this.clusters = new Map();
  }

  /**
   * Create a cluster from embeddings
   * @param {Array<Array<number>>} embeddings - Array of embeddings to cluster
   * @returns {Promise<Object>} The created cluster
   */
  async createCluster(embeddings) {
    try {
      this.logger.info('Creating cluster', { 
        embeddingCount: embeddings.length 
      });
      
      // Create HDBSCAN instance
      const clusterer = new hdbscan.HDBSCAN({
        minClusterSize: this.config.minClusterSize,
        minSamples: this.config.minSamples
      });
      
      // Fit clusterer to embeddings
      clusterer.fit(embeddings);
      
      // Get cluster labels
      const labels = clusterer.getLabels();
      
      // Create cluster object
      const cluster = {
        id: this.generateClusterId(),
        embeddings,
        labels,
        metadata: {
          minClusterSize: this.config.minClusterSize,
          minSamples: this.config.minSamples,
          clusterCount: new Set(labels).size,
          created: new Date().toISOString()
        }
      };
      
      // Store cluster
      this.clusters.set(cluster.id, cluster);
      
      this.logger.info('Cluster created successfully', { 
        clusterId: cluster.id,
        clusterCount: cluster.metadata.clusterCount 
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
   * Get a cluster by ID
   * @param {string} clusterId - The ID of the cluster to get
   * @returns {Promise<Object>} The cluster
   */
  async getCluster(clusterId) {
    try {
      this.logger.info('Getting cluster', { clusterId });
      
      // Get cluster
      const cluster = this.clusters.get(clusterId);
      
      if (!cluster) {
        throw new Error(`Cluster not found: ${clusterId}`);
      }
      
      this.logger.info('Got cluster successfully', { 
        clusterId,
        clusterCount: cluster.metadata.clusterCount 
      });
      
      return cluster;
    } catch (error) {
      this.logger.error('Failed to get cluster', { 
        clusterId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Merge multiple clusters
   * @param {Array<Object>} clusters - Array of clusters to merge
   * @returns {Promise<Object>} The merged cluster
   */
  async mergeClusters(clusters) {
    try {
      this.logger.info('Merging clusters', { 
        clusterCount: clusters.length 
      });
      
      // Combine embeddings
      const embeddings = clusters.flatMap(cluster => cluster.embeddings);
      
      // Create new cluster
      const merged = await this.createCluster(embeddings);
      
      // Update metadata
      merged.metadata = {
        ...merged.metadata,
        sourceClusters: clusters.map(c => c.id),
        mergedAt: new Date().toISOString()
      };
      
      this.logger.info('Clusters merged successfully', { 
        mergedClusterId: merged.id,
        sourceClusterCount: clusters.length 
      });
      
      return merged;
    } catch (error) {
      this.logger.error('Failed to merge clusters', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Delete a cluster
   * @param {string} clusterId - The ID of the cluster to delete
   * @returns {Promise<void>}
   */
  async deleteCluster(clusterId) {
    try {
      this.logger.info('Deleting cluster', { clusterId });
      
      // Delete cluster
      const deleted = this.clusters.delete(clusterId);
      
      if (!deleted) {
        throw new Error(`Cluster not found: ${clusterId}`);
      }
      
      this.logger.info('Cluster deleted successfully', { clusterId });
    } catch (error) {
      this.logger.error('Failed to delete cluster', { 
        clusterId,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Generate a unique cluster ID
   * @returns {string} The generated cluster ID
   * @private
   */
  generateClusterId() {
    return `cluster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get health status of the clustering service
   * @returns {Promise<Object>} Health status
   */
  async getHealth() {
    try {
      return {
        status: 'healthy',
        stats: {
          clusterCount: this.clusters.size,
          minClusterSize: this.config.minClusterSize,
          minSamples: this.config.minSamples
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
  ClusteringService
}; 