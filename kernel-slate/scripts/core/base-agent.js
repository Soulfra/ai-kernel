/**
 * @file base-agent.js
 * @description Base Agent class for CLARITY_ENGINE.
 * Provides common lifecycle and operation methods.
 * @version 1.0.0
 * @lastUpdated 2025-07-27T06:00:00Z
 */

const { Logger } = require('./logger');

class BaseAgent {
  constructor({ id = 'agent', type = 'base' } = {}) {
    this.id = id;
    this.type = type;
    this.capabilities = [];
    this.state = {};
    this.logger = new Logger(`${this.type}-${this.id}`);
  }

  async initialize() {
    this.logger.info('Initializing agent');
  }

  async shutdown() {
    this.logger.info('Shutting down agent');
  }

  async perceive(context) {
    this.logger.debug('Perceiving context');
    return context;
  }

  async reason(perception) {
    this.logger.debug('Reasoning');
    return { plan: [] };
  }

  async act(plan) {
    this.logger.debug('Acting on plan');
    return { result: null };
  }
}

module.exports = BaseAgent;
