const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;
const LogOrchestrator = require('./log-orchestrator');
const TelemetryManager = require('./telemetry-manager');
const telemetryManager = new TelemetryManager();

class OrchestrationManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      configPath: options.configPath || './config/orchestration.json',
      maxDepth: options.maxDepth || 3,
      enableValidation: options.enableValidation || true,
      enableMetrics: options.enableMetrics || true,
      ...options
    };

    this.logger = new LogOrchestrator({
      logDir: path.join(__dirname, '../../logs'),
      enableMetrics: this.options.enableMetrics
    });

    this.orchestrators = new Map();
    this.dependencies = new Map();
    this.validationRules = new Map();
    this.metrics = new Map();
    this.executionHistory = new Map();
  }

  async initialize() {
    try {
      await this.logger.initialize();
      this.logger.info('Initializing OrchestrationManager');

      await telemetryManager.startSpan('OrchestrationManager.initialize');

      // Load configuration
      await this.loadConfig();

      // Initialize validation rules
      await this.initializeValidationRules();

      // Register core orchestrators
      await this.registerCoreOrchestrators();

      this.logger.info('OrchestrationManager initialized', {
        orchestratorCount: this.orchestrators.size,
        validationRuleCount: this.validationRules.size
      });

      this.emit('initialized');

      await telemetryManager.endSpan('OrchestrationManager.initialize');
    } catch (error) {
      this.logger.error('Failed to initialize OrchestrationManager', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async loadConfig() {
    try {
      const config = JSON.parse(await fs.readFile(this.options.configPath, 'utf8'));
      this.config = config;
      this.logger.info('Configuration loaded', { configPath: this.options.configPath });
    } catch (error) {
      this.logger.warn('No config file found, using defaults');
      this.config = {
        orchestrators: {},
        validationRules: {},
        dependencies: {}
      };
    }
  }

  async initializeValidationRules() {
    // Core validation rules
    this.validationRules.set('nonRecursive', {
      validate: (orchestrator, depth = 0) => {
        if (depth > this.options.maxDepth) {
          throw new Error(`Recursion depth exceeded: ${depth}`);
        }
        return true;
      }
    });

    this.validationRules.set('dependencyCheck', {
      validate: (orchestrator) => {
        const deps = this.dependencies.get(orchestrator.name) || [];
        for (const dep of deps) {
          if (!this.orchestrators.has(dep)) {
            throw new Error(`Missing dependency: ${dep}`);
          }
        }
        return true;
      }
    });

    this.validationRules.set('circularDependencyCheck', {
      validate: (orchestrator) => {
        const visited = new Set();
        const stack = new Set();

        const hasCycle = (name) => {
          if (!visited.has(name)) {
            visited.add(name);
            stack.add(name);

            const deps = this.dependencies.get(name) || [];
            for (const dep of deps) {
              if (!visited.has(dep) && hasCycle(dep)) {
                return true;
              } else if (stack.has(dep)) {
                return true;
              }
            }
          }
          stack.delete(name);
          return false;
        };

        return !hasCycle(orchestrator.name);
      }
    });
  }

  async registerCoreOrchestrators() {
    const coreOrchestrators = [
      { name: 'LogOrchestrator', path: './log-orchestrator' },
      { name: 'DebugOrchestrator', path: './debug-orchestrator' },
      { name: 'TaskOrchestrator', path: './task-orchestrator' },
      { name: 'DocumentationOrchestrator', path: './documentation-orchestrator' },
      { name: 'QualityOrchestrator', path: './quality-orchestrator' },
      { name: 'AgentOrchestrator', path: './agent-orchestrator' }
    ];

    for (const { name, path: orchestratorPath } of coreOrchestrators) {
      try {
        const Orchestrator = require(orchestratorPath);
        await this.registerOrchestrator(name, new Orchestrator(this.options));
      } catch (error) {
        this.logger.error(`Failed to register ${name}`, {
          error: error.message,
          stack: error.stack
        });
      }
    }
  }

  async registerOrchestrator(name, orchestrator) {
    if (this.orchestrators.has(name)) {
      throw new Error(`Orchestrator ${name} already registered`);
    }

    // Validate orchestrator
    for (const [ruleName, rule] of this.validationRules) {
      try {
        rule.validate(orchestrator);
      } catch (error) {
        this.logger.error(`Validation failed for ${name}`, {
          rule: ruleName,
          error: error.message
        });
        throw error;
      }
    }

    // Register orchestrator
    this.orchestrators.set(name, orchestrator);
    this.dependencies.set(name, orchestrator.dependencies || []);
    this.executionHistory.set(name, []);

    // Set up event forwarding
    orchestrator.on('error', (error) => this.handleOrchestratorError(name, error));
    orchestrator.on('complete', (result) => this.handleOrchestratorComplete(name, result));

    this.logger.info(`Registered orchestrator: ${name}`);
    this.emit('orchestratorRegistered', { name, orchestrator });
  }

  async executeOrchestrator(name, params = {}, depth = 0) {
    if (!this.orchestrators.has(name)) {
      throw new Error(`Orchestrator ${name} not found`);
    }

    // Check recursion depth
    if (depth > this.options.maxDepth) {
      throw new Error(`Maximum recursion depth exceeded: ${depth}`);
    }

    const orchestrator = this.orchestrators.get(name);
    const startTime = Date.now();

    await telemetryManager.startSpan('OrchestrationManager.executeOrchestrator');

    try {
      // Execute orchestrator
      const result = await orchestrator.execute(params);

      // Record execution
      const execution = {
        timestamp: new Date().toISOString(),
        params,
        result,
        duration: Date.now() - startTime
      };
      this.executionHistory.get(name).push(execution);

      // Update metrics
      this.updateMetrics(name, execution);

      return result;
    } catch (error) {
      this.logger.error(`Execution failed for ${name}`, {
        error: error.message,
        stack: error.stack,
        params
      });
      throw error;
    } finally {
      await telemetryManager.endSpan('OrchestrationManager.executeOrchestrator');
    }
  }

  updateMetrics(name, execution) {
    const metrics = this.metrics.get(name) || {
      totalExecutions: 0,
      averageDuration: 0,
      successCount: 0,
      failureCount: 0
    };

    metrics.totalExecutions++;
    metrics.averageDuration = (metrics.averageDuration * (metrics.totalExecutions - 1) + execution.duration) / metrics.totalExecutions;

    if (execution.result.success) {
      metrics.successCount++;
    } else {
      metrics.failureCount++;
    }

    this.metrics.set(name, metrics);
  }

  async handleOrchestratorError(name, error) {
    this.logger.error(`Orchestrator error: ${name}`, {
      error: error.message,
      stack: error.stack
    });
    this.emit('orchestratorError', { orchestrator: name, error });

    await telemetryManager.recordMetric('orchestration_manager_error', 1, { name });
  }

  async handleOrchestratorComplete(name, result) {
    this.logger.info(`Orchestrator completed: ${name}`, { result });
    this.emit('orchestratorComplete', { orchestrator: name, result });
  }

  getOrchestrator(name) {
    return this.orchestrators.get(name);
  }

  getDependencies(name) {
    return this.dependencies.get(name) || [];
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  getExecutionHistory(name) {
    return this.executionHistory.get(name) || [];
  }

  async cleanup() {
    this.logger.info('Cleaning up OrchestrationManager');
    
    for (const [name, orchestrator] of this.orchestrators) {
      try {
        await orchestrator.cleanup();
        this.logger.info(`Cleaned up ${name}`);
      } catch (error) {
        this.logger.error(`Error cleaning up ${name}`, {
          error: error.message,
          stack: error.stack
        });
      }
    }
    
    await this.logger.cleanup();
    this.removeAllListeners();
  }
}

module.exports = OrchestrationManager; 