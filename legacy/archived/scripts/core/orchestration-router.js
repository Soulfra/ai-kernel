/**
 * Crosslinks:
 * - Layer0 Soulfra Standard: ../../docs/architecture/layer0-soulfra-standard.md
 * - Finalization Dashboard: ../../project_meta/insights/finalization_dashboard.md
 * - Suggestion Log: ../../project_meta/suggestion_log.md
 * - Orchestration Router: ../../scripts/core/orchestration-router.js
 * - .cursorrules.json: ../../.cursorrules.json
 * - SOULFRA_STANDARD_HANDOFF.md: ../../docs/hand-off/SOULFRA_STANDARD_HANDOFF.md
 */
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;
const LogOrchestrator = require('./log-orchestrator');
const DebugOrchestrator = require('./debug-orchestrator');
const MetaOrchestrator = require('./meta-orchestrator');
const TaskLogger = require('./task-logger');
const TelemetryManager = require('./telemetry-manager');
const BackupOrchestrator = require('./backup-orchestrator');
const WriterOrchestrator = require('./writer-orchestrator');
const SummarizerOrchestrator = require('./summarizer-orchestrator');
const PlannerOrchestrator = require('./planner-orchestrator');

class OrchestrationRouter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      configPath: options.configPath || './config/meta-orchestrator.json',
      enableParallel: options.enableParallel || true,
      maxConcurrent: options.maxConcurrent || 5,
      timeout: options.timeout || 30000,
      retryAttempts: options.retryAttempts || 3,
      ...options
    };

    this.orchestrators = new Map();
    this.initializationOrder = [
      'BackupOrchestrator',
      'LogOrchestrator',
      'DebugOrchestrator',
      'MetaOrchestrator',
      'SummarizerOrchestrator',
      'WriterOrchestrator',
      'PlannerOrchestrator'
    ];
    this.initializationStatus = new Map();
    this.taskLogger = new TaskLogger({
      logDir: path.join(__dirname, '../../logs/tasks'),
      versionFile: path.join(__dirname, '../../version.json'),
      enableTelemetry: true
    });
    this.telemetry = new TelemetryManager({
      metricsDir: path.join(__dirname, '../../logs/metrics')
    });
    this.logOrchestrator = new LogOrchestrator();
    this.backupOrchestrator = new BackupOrchestrator(this.options, { logger: this.logOrchestrator, telemetryManager: this.telemetry });
    this.summarizerOrchestrator = null;
    this.writerOrchestrator = null;
    this.plannerOrchestrator = null;
  }

  async initialize() {
    try {
      await this.telemetry.startSpan('OrchestrationRouter.initialize');

      // Initialize telemetry first
      await this.telemetry.initialize();
      await this.telemetry.recordMetric('system_initialization_start', 1, { component: 'orchestration_router' });

      // Initialize task logger
      await this.taskLogger.initialize();
      await this.taskLogger.logTask({
        type: 'system',
        event: 'initialization_start',
        status: 'in_progress',
        details: 'Starting orchestration system initialization'
      });

      // Load configuration
      await this.loadConfig();

      // Initialize orchestrators in order
      for (const orchestratorName of this.initializationOrder) {
        await this.initializeOrchestrator(orchestratorName);
      }

      // Set up event routing
      this.setupEventRouting();

      await this.taskLogger.logTask({
        type: 'system',
        event: 'initialization_complete',
        status: 'completed',
        details: 'Orchestration system initialization completed'
      });

      await this.telemetry.recordMetric('system_initialization_complete', 1, { component: 'orchestration_router' });

      this.emit('initialized', {
        orchestrators: Array.from(this.orchestrators.keys()),
        status: Object.fromEntries(this.initializationStatus)
      });

      await this.telemetry.endSpan('OrchestrationRouter.initialize');
    } catch (error) {
      await this.telemetry.recordMetric('system_initialization_error', 1, { 
        component: 'orchestration_router',
        error: error.message
      });
      await this.taskLogger.logTask({
        type: 'system',
        event: 'initialization_error',
        status: 'failed',
        details: `Failed to initialize OrchestrationRouter: ${error.message}`
      });
      this.emit('error', new Error(`Failed to initialize OrchestrationRouter: ${error.message}`));
      throw error;
    }
  }

  async loadConfig() {
    try {
      const config = JSON.parse(await fs.readFile(this.options.configPath, 'utf8'));
      this.config = config;
      await this.telemetry.recordMetric('config_loaded', 1, { status: 'success' });
      await this.taskLogger.logTask({
        type: 'config',
        event: 'config_loaded',
        status: 'completed',
        details: 'Configuration loaded successfully'
      });
    } catch (error) {
      await this.logOrchestrator.warn('No config file found, using defaults');
      this.config = {
        orchestrators: {},
        workflows: {}
      };
      await this.telemetry.recordMetric('config_loaded', 1, { status: 'default' });
      await this.taskLogger.logTask({
        type: 'config',
        event: 'config_default',
        status: 'completed',
        details: 'Using default configuration'
      });
    }
  }

  async initializeOrchestrator(name) {
    const startTime = Date.now();
    try {
      await this.telemetry.recordMetric('orchestrator_initialization_start', 1, { orchestrator: name });
      await this.taskLogger.logTask({
        type: 'orchestrator',
        event: 'initialization_start',
        status: 'in_progress',
        details: `Starting initialization of ${name}`
      });

      let orchestrator;
      const config = this.config.orchestrators[name] || {};

      switch (name) {
        case 'BackupOrchestrator':
          orchestrator = this.backupOrchestrator;
          await orchestrator.initialize();
          await orchestrator.ensureSafeBackup({ scope: 'full', dryRun: false, approval: true });
          break;
        case 'LogOrchestrator':
          orchestrator = this.logOrchestrator;
          await orchestrator.initialize();
          break;
        case 'DebugOrchestrator':
          orchestrator = new DebugOrchestrator(config);
          await orchestrator.initialize();
          break;
        case 'MetaOrchestrator':
          orchestrator = new MetaOrchestrator(config);
          await orchestrator.initialize();
          break;
        case 'SummarizerOrchestrator':
          this.summarizerOrchestrator = new SummarizerOrchestrator(config, {
            logger: this.logOrchestrator,
            telemetryManager: this.telemetry,
            writerOrchestrator: null
          });
          orchestrator = this.summarizerOrchestrator;
          await orchestrator.initialize();
          break;
        case 'WriterOrchestrator':
          this.writerOrchestrator = new WriterOrchestrator(config, {
            logger: this.logOrchestrator,
            telemetryManager: this.telemetry,
            backupOrchestrator: this.backupOrchestrator
          });
          if (this.summarizerOrchestrator) {
            this.summarizerOrchestrator.writerOrchestrator = this.writerOrchestrator;
          }
          orchestrator = this.writerOrchestrator;
          await orchestrator.initialize();
          break;
        case 'PlannerOrchestrator':
          this.plannerOrchestrator = new PlannerOrchestrator(config, {
            logger: this.logOrchestrator,
            writerOrchestrator: this.writerOrchestrator,
            summarizerOrchestrator: this.summarizerOrchestrator
          });
          orchestrator = this.plannerOrchestrator;
          await orchestrator.initialize();
          break;
        default:
          throw new Error(`Unknown orchestrator: ${name}`);
      }

      this.orchestrators.set(name, orchestrator);
      this.initializationStatus.set(name, 'initialized');

      // Forward events from sub-orchestrators
      orchestrator.on('error', (error) => this.handleOrchestratorError(name, error));
      orchestrator.on('complete', (result) => this.handleOrchestratorComplete(name, result));

      const duration = Date.now() - startTime;
      await this.telemetry.recordHistogram('orchestrator_initialization_duration', duration, { orchestrator: name });
      await this.telemetry.recordMetric('orchestrator_initialization_complete', 1, { orchestrator: name, status: 'success' });
      await this.taskLogger.logTask({
        type: 'orchestrator',
        event: 'initialization_complete',
        status: 'completed',
        details: `${name} initialized successfully`
      });

      this.emit('orchestratorInitialized', { name, status: 'initialized' });
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.telemetry.recordHistogram('orchestrator_initialization_duration', duration, { 
        orchestrator: name,
        status: 'error'
      });
      await this.telemetry.recordMetric('orchestrator_initialization_error', 1, { 
        orchestrator: name,
        error: error.message
      });
      this.initializationStatus.set(name, 'failed');
      await this.taskLogger.logTask({
        type: 'orchestrator',
        event: 'initialization_error',
        status: 'failed',
        details: `Failed to initialize ${name}: ${error.message}`
      });
      this.emit('orchestratorError', { name, error });
    }
  }

  setupEventRouting() {
    // Route logs, errors, docs, metrics from all orchestrators to SummarizerOrchestrator
    for (const [name, orchestrator] of this.orchestrators.entries()) {
      if (name !== 'SummarizerOrchestrator' && name !== 'WriterOrchestrator' && name !== 'PlannerOrchestrator') {
        orchestrator.on('log', (payload) => {
          this.summarizerOrchestrator && this.summarizerOrchestrator.enqueueSummary('log', payload, { source: name });
        });
        orchestrator.on('error', (payload) => {
          this.summarizerOrchestrator && this.summarizerOrchestrator.enqueueSummary('error', payload, { source: name });
        });
        orchestrator.on('doc', (payload) => {
          this.summarizerOrchestrator && this.summarizerOrchestrator.enqueueSummary('doc', payload, { source: name });
        });
        orchestrator.on('metrics', (payload) => {
          this.summarizerOrchestrator && this.summarizerOrchestrator.enqueueSummary('metrics', payload, { source: name });
        });
        // Route goal/task events to PlannerOrchestrator
        orchestrator.on('goal', (payload) => {
          this.plannerOrchestrator && this.plannerOrchestrator.registerGoal(payload);
        });
        orchestrator.on('goalStatus', (payload) => {
          if (this.plannerOrchestrator && payload.id && payload.status) {
            this.plannerOrchestrator.updateGoalStatus(payload.id, payload.status, payload.details || '');
          }
        });
      }
    }
    // Summarizer emits summaries to Writer
    if (this.summarizerOrchestrator && this.writerOrchestrator) {
      this.summarizerOrchestrator.on('summary', (summary, metadata) => {
        this.writerOrchestrator.enqueueOutput('summary', summary, metadata);
      });
    }

    // Route meta orchestrator events
    const metaOrchestrator = this.orchestrators.get('MetaOrchestrator');
    if (metaOrchestrator) {
      metaOrchestrator.on('workflowStarted', async (data) => {
        const logOrchestrator = this.orchestrators.get('LogOrchestrator');
        logOrchestrator?.info('Workflow started', data);
        await this.telemetry.recordMetric('workflow_started', 1, { 
          workflow: data.name,
          ...data
        });
        await this.taskLogger.logTask({
          type: 'workflow',
          event: 'started',
          status: 'in_progress',
          details: `Workflow ${data.name} started`
        });
      });

      metaOrchestrator.on('workflowCompleted', async (data) => {
        const logOrchestrator = this.orchestrators.get('LogOrchestrator');
        logOrchestrator?.info('Workflow completed', data);
        await this.telemetry.recordMetric('workflow_completed', 1, { 
          workflow: data.name,
          ...data
        });
        await this.taskLogger.logTask({
          type: 'workflow',
          event: 'completed',
          status: 'completed',
          details: `Workflow ${data.name} completed`
        });
      });

      metaOrchestrator.on('workflowFailed', async (data) => {
        const logOrchestrator = this.orchestrators.get('LogOrchestrator');
        logOrchestrator?.error('Workflow failed', data);
        const debugOrchestrator = this.orchestrators.get('DebugOrchestrator');
        debugOrchestrator?.handleError('workflow', new Error(data.error));
        await this.telemetry.recordMetric('workflow_failed', 1, { 
          workflow: data.name,
          error: data.error
        });
        await this.taskLogger.logTask({
          type: 'workflow',
          event: 'failed',
          status: 'failed',
          details: `Workflow ${data.name} failed: ${data.error}`
        });
      });
    }
  }

  async handleOrchestratorError(name, error) {
    const logOrchestrator = this.orchestrators.get('LogOrchestrator');
    const debugOrchestrator = this.orchestrators.get('DebugOrchestrator');

    await this.logOrchestrator.error(`Orchestrator ${name} error`, { error: error.message });
    debugOrchestrator?.handleError(name, error);
    await this.telemetry.recordMetric('orchestrator_error', 1, { 
      orchestrator: name,
      error: error.message
    });
    await this.taskLogger.logTask({
      type: 'orchestrator',
      event: 'error',
      status: 'error',
      details: `Orchestrator ${name} error: ${error.message}`
    });
    await this.telemetry.recordMetric('orchestration_router_error', 1, { name });
    this.emit('orchestratorError', { name, error });
  }

  async handleOrchestratorComplete(name, result) {
    const logOrchestrator = this.orchestrators.get('LogOrchestrator');
    await this.logOrchestrator.info(`Orchestrator ${name} completed`, result);
    await this.telemetry.recordMetric('orchestrator_complete', 1, { 
      orchestrator: name,
      status: 'success'
    });
    await this.taskLogger.logTask({
      type: 'orchestrator',
      event: 'complete',
      status: 'completed',
      details: `Orchestrator ${name} completed successfully`
    });
    this.emit('orchestratorComplete', { name, result });
  }

  getOrchestrator(name) {
    return this.orchestrators.get(name);
  }

  async executeWorkflow(workflowName, params) {
    await this.backupOrchestrator.ensureSafeBackup({ scope: 'full', dryRun: false, approval: true });
    const startTime = Date.now();
    const metaOrchestrator = this.orchestrators.get('MetaOrchestrator');
    if (!metaOrchestrator) {
      throw new Error('MetaOrchestrator not initialized');
    }

    try {
      await this.telemetry.startSpan('OrchestrationRouter.executeWorkflow');

      const result = await metaOrchestrator.executeWorkflow(workflowName, params);
      const duration = Date.now() - startTime;
      await this.telemetry.recordHistogram('workflow_execution_duration', duration, { 
        workflow: workflowName,
        status: 'success'
      });
      await this.telemetry.endSpan('OrchestrationRouter.executeWorkflow');
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.telemetry.recordHistogram('workflow_execution_duration', duration, { 
        workflow: workflowName,
        status: 'error'
      });
      throw error;
    }
  }

  async cleanup() {
    await this.telemetry.recordMetric('system_cleanup_start', 1, { component: 'orchestration_router' });
    await this.taskLogger.logTask({
      type: 'system',
      event: 'cleanup_start',
      status: 'in_progress',
      details: 'Starting system cleanup'
    });

    // Clean up in reverse order
    for (const name of [...this.initializationOrder].reverse()) {
      const orchestrator = this.orchestrators.get(name);
      if (orchestrator) {
        try {
          await orchestrator.cleanup();
        } catch (error) {
          await this.logOrchestrator.error(`Error cleaning up ${name}:`, error);
          await this.telemetry.recordMetric('orchestrator_cleanup_error', 1, { 
            orchestrator: name,
            error: error.message
          });
          await this.taskLogger.logTask({
            type: 'system',
            event: 'cleanup_error',
            status: 'error',
            details: `Error cleaning up ${name}: ${error.message}`
          });
        }
      }
    }

    await this.telemetry.recordMetric('system_cleanup_complete', 1, { component: 'orchestration_router' });
    await this.taskLogger.logTask({
      type: 'system',
      event: 'cleanup_complete',
      status: 'completed',
      details: 'System cleanup completed'
    });

    this.removeAllListeners();
  }
}

module.exports = OrchestrationRouter; 