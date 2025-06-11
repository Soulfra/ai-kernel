/**
 * @file logger.js
 * @description Logger implementation for CLARITY_ENGINE
 * @version 1.0.0
 * @lastUpdated 2025-06-08T04:36:01Z
 */

const winston = require('winston');
const path = require('path');

class Logger {
  constructor(service) {
    this.service = service;
    this.logger = this.createLogger();
  }

  /**
   * Create a Winston logger instance
   * @returns {winston.Logger} The created logger
   * @private
   */
  createLogger() {
    // Define log format
    const format = winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    );
    
    // Create logger
    const logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format,
      defaultMeta: {
        service: this.service
      },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        }),
        
        // File transport for all logs
        new winston.transports.File({
          filename: path.join('logs', 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        
        // File transport for error logs
        new winston.transports.File({
          filename: path.join('logs', 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ]
    });
    
    return logger;
  }

  /**
   * Log an info message
   * @param {string} message - The message to log
   * @param {Object} [metadata] - Additional metadata to log
   */
  info(message, metadata = {}) {
    this.logger.info(message, metadata);
  }

  /**
   * Log an error message
   * @param {string} message - The message to log
   * @param {Object} [metadata] - Additional metadata to log
   */
  error(message, metadata = {}) {
    this.logger.error(message, metadata);
  }

  /**
   * Log a warning message
   * @param {string} message - The message to log
   * @param {Object} [metadata] - Additional metadata to log
   */
  warn(message, metadata = {}) {
    this.logger.warn(message, metadata);
  }

  /**
   * Log a debug message
   * @param {string} message - The message to log
   * @param {Object} [metadata] - Additional metadata to log
   */
  debug(message, metadata = {}) {
    this.logger.debug(message, metadata);
  }

  /**
   * Log a verbose message
   * @param {string} message - The message to log
   * @param {Object} [metadata] - Additional metadata to log
   */
  verbose(message, metadata = {}) {
    this.logger.verbose(message, metadata);
  }

  /**
   * Log a silly message
   * @param {string} message - The message to log
   * @param {Object} [metadata] - Additional metadata to log
   */
  silly(message, metadata = {}) {
    this.logger.silly(message, metadata);
  }

  /**
   * Get health status of the logger
   * @returns {Promise<Object>} Health status
   */
  async getHealth() {
    try {
      return {
        status: 'healthy',
        stats: {
          service: this.service,
          level: this.logger.level
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = {
  Logger
}; 