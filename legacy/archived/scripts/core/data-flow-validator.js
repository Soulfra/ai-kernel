const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;

class DataFlowValidator extends EventEmitter {
  constructor(options = {}) {
    super();
    this.sources = new Map();
    this.flows = new Map();
    this.validationRules = new Map();
    this.options = {
      logDir: options.logDir || 'logs/data-flow',
      maxFlowDepth: options.maxFlowDepth || 3,
      validateOnRead: options.validateOnRead ?? true
    };
    this.logPath = options.logPath;
  }

  async initialize() {
    await fs.mkdir(this.options.logDir, { recursive: true });
    this.setupDefaultRules();
  }

  setupDefaultRules() {
    // Task Log Rules
    this.addValidationRule('task_log', {
      requiredFields: ['taskId', 'description', 'status', 'priority'],
      sourceType: 'primary',
      maxSize: 1024 * 1024 // 1MB
    });

    // Orchestrator Rules
    this.addValidationRule('orchestrator', {
      requiredFields: ['name', 'type', 'config'],
      sourceType: 'secondary',
      dependencies: ['task_log']
    });

    // Documentation Rules
    this.addValidationRule('documentation', {
      requiredFields: ['title', 'content', 'metadata'],
      sourceType: 'secondary',
      maxSize: 1024 * 1024 * 5 // 5MB
    });
  }

  addValidationRule(name, rule) {
    this.validationRules.set(name, rule);
  }

  async validateSource(sourceId, data, type) {
    const rule = this.validationRules.get(type);
    if (!rule) {
      throw new Error(`No validation rule found for type: ${type}`);
    }

    const validationResult = {
      sourceId,
      type,
      timestamp: new Date().toISOString(),
      valid: true,
      errors: []
    };

    // Check required fields
    if (rule.requiredFields) {
      for (const field of rule.requiredFields) {
        if (!data[field]) {
          validationResult.valid = false;
          validationResult.errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Check size limits
    if (rule.maxSize) {
      const size = JSON.stringify(data).length;
      if (size > rule.maxSize) {
        validationResult.valid = false;
        validationResult.errors.push(`Data exceeds maximum size: ${size} > ${rule.maxSize}`);
      }
    }

    // Track source
    this.sources.set(sourceId, {
      type,
      lastValidated: validationResult.timestamp,
      validationResult
    });

    this.emit('validation', validationResult);
    return validationResult;
  }

  async trackFlow(sourceId, targetId, flowType) {
    const flow = {
      sourceId,
      targetId,
      flowType,
      timestamp: new Date().toISOString()
    };

    if (!this.flows.has(sourceId)) {
      this.flows.set(sourceId, new Set());
    }
    this.flows.get(sourceId).add(flow);

    this.emit('flow', flow);
    return flow;
  }

  async getSourceHistory(sourceId) {
    return this.sources.get(sourceId);
  }

  async getFlowHistory(sourceId) {
    return Array.from(this.flows.get(sourceId) || []);
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      sources: Object.fromEntries(this.sources),
      flows: Object.fromEntries(
        Array.from(this.flows.entries()).map(([key, value]) => [
          key,
          Array.from(value)
        ])
      )
    };

    const reportPath = path.join(
      this.options.logDir,
      `data-flow-report-${Date.now()}.json`
    );
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    return report;
  }

  async cleanup() {
    // No cleanup needed for now
    return Promise.resolve();
  }
}

module.exports = DataFlowValidator; 