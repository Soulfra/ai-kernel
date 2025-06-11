/**
 * @file orchestration-agent.js
 * @description Orchestration Agent for coordinating workflows.
 * Uses self-healing log creation via ensureFileAndDir.
 * @version 1.0.0
 * @lastUpdated 2025-07-27T06:00:00Z
 */

const fs = require('fs');
const path = require('path');
const BaseAgent = require('./base-agent');
const ensureFileAndDir = require('../../shared/utils/ensureFileAndDir');

class OrchestrationAgent extends BaseAgent {
  constructor(options = {}) {
    super({ id: options.id || 'orchestrator', type: 'orchestration' });
    this.logPath = options.logPath || path.resolve('logs/orchestration.log');
  }

  async runWorkflow(steps = []) {
    ensureFileAndDir(this.logPath);
    const results = [];
    for (const step of steps) {
      try {
        const name = step.name || 'step';
        this.logger.info('Running step', { step: name });
        const result = await step();
        results.push({ step: name, status: 'success', result });
        fs.appendFileSync(
          this.logPath,
          JSON.stringify({ step: name, status: 'success' }) + '\n'
        );
      } catch (error) {
        const name = step.name || 'step';
        results.push({ step: name, status: 'failure', error: error.message });
        fs.appendFileSync(
          this.logPath,
          JSON.stringify({ step: name, status: 'failure', error: error.message }) + '\n'
        );
        this.logger.error('Step failed', { step: name, error: error.message });
        throw error;
      }
    }
    return results;
  }
}

module.exports = OrchestrationAgent;
