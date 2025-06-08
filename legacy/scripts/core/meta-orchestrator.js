const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;
const LogOrchestrator = require('./log-orchestrator');
const PriorityQueue = require('priorityqueuejs');
const TelemetryManager = require('./telemetry-manager');
const BackupOrchestrator = require('./backup-orchestrator');

class MetaOrchestrator extends EventEmitter {
  /**
   * @param {object} options
   * @param {object} di - Dependency injection: { logger, telemetryManager, orchestratorOverrides }
   * orchestratorOverrides: { [className]: OrchestratorClass }
   */
  constructor(options = {}, { logger, telemetryManager, orchestratorOverrides } = {}) {
    super();
    this.options = {
      configPath: options.configPath || './config/meta-orchestrator.json',
      maxConcurrent: options.maxConcurrent || 5,
      batchSize: options.batchSize || 10,
      cacheEnabled: options.cacheEnabled || true,
      llmOptimization: options.llmOptimization || true,
      ...options
    };
    this.logger = logger || new LogOrchestrator({
      logDir: path.join(__dirname, '../../logs'),
      enableMetrics: true
    });
    this.telemetryManager = telemetryManager || new TelemetryManager();
    this.orchestratorOverrides = orchestratorOverrides || {};
    this.taskQueue = new PriorityQueue((a, b) => b.priority - a.priority);
    this.runningTasks = new Map();
    this.completedTasks = new Set();
    this.failedTasks = new Set();
    this.cache = new Map();
    this.orchestrators = new Map();
    this.workflows = new Map();
    this.state = new Map();
    this.healthStatus = new Map();
    this.metrics = new Map();
  }

  async initialize() {
    try {
      await this.telemetryManager.startSpan('MetaOrchestrator.initialize');
      await this.logger.initialize();
      this.logger.info('Initializing MetaOrchestrator', { options: this.options });
      
      // Load configuration
      await this.loadConfig();
      
      // Initialize core orchestrators
      await this.initializeCoreOrchestrators();
      
      // Initialize workflows
      await this.initializeWorkflows();
      
      this.logger.info('MetaOrchestrator initialized', {
        orchestratorCount: this.orchestrators.size,
        workflowCount: this.workflows.size
      });
      
      this.emit('initialized', {
        orchestratorCount: this.orchestrators.size,
        workflowCount: this.workflows.size
      });
      await this.telemetryManager.endSpan('MetaOrchestrator.initialize');
    } catch (error) {
      this.logger.error('Failed to initialize MetaOrchestrator', { error: error.message });
      this.emit('error', new Error(`Failed to initialize MetaOrchestrator: ${error.message}`));
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
        workflows: {}
      };
    }
  }

  async initializeCoreOrchestrators() {
    // Inject BackupOrchestrator as the first orchestrator to initialize
    const orchestratorOrder = [
      'BackupOrchestrator',
      'LogOrchestrator',
      'DebugOrchestrator',
      'TaskOrchestrator',
      'DocumentationOrchestrator',
      'QualityOrchestrator',
      'AgentOrchestrator'
    ];
    const orchestratorFileMap = {
      BackupOrchestrator: 'backup-orchestrator',
      LogOrchestrator: 'log-orchestrator',
      DebugOrchestrator: 'debug-orchestrator',
      TaskOrchestrator: 'task-orchestrator',
      DocumentationOrchestrator: 'documentation-orchestrator',
      QualityOrchestrator: 'quality-orchestrator',
      AgentOrchestrator: 'agent-orchestrator'
    };
    for (const orchestratorName of orchestratorOrder) {
      try {
        const Orchestrator = this.orchestratorOverrides[orchestratorName] || require(`./${orchestratorFileMap[orchestratorName]}`);
        const subLogger = this.logger;
        const subTelemetry = this.telemetryManager;
        const orchestrator = new Orchestrator(this.options, { logger: subLogger, telemetryManager: subTelemetry });
        if (orchestratorName === 'BackupOrchestrator') {
          // Require a valid backup before proceeding
          await orchestrator.initialize();
          await orchestrator.ensureSafeBackup({ scope: 'full', dryRun: false, approval: true });
        } else {
          await orchestrator.initialize();
        }
        this.orchestrators.set(orchestratorName, orchestrator);
        orchestrator.on('error', (error) => this.handleOrchestratorError(orchestratorName, error));
        orchestrator.on('complete', (result) => this.handleOrchestratorComplete(orchestratorName, result));
        this.logger.info(`Initialized ${orchestratorName}`, {
          status: 'success',
          options: this.options
        });
      } catch (error) {
        this.logger.error(`Failed to initialize ${orchestratorName}`, {
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    }
  }

  async initializeWorkflows() {
    this.workflows.set('documentation', this.createDocumentationWorkflow());
    this.workflows.set('testing', this.createTestingWorkflow());
    this.workflows.set('deployment', this.createDeploymentWorkflow());
    this.workflows.set('maintenance', this.createMaintenanceWorkflow());
    
    this.logger.info('Workflows initialized', {
      workflows: Array.from(this.workflows.keys())
    });
  }

  createDocumentationWorkflow() {
    return async (params) => {
      this.logger.info('Starting documentation workflow', { params });
      
      const docOrchestrator = this.orchestrators.get('DocumentationOrchestrator');
      const qualityOrchestrator = this.orchestrators.get('QualityOrchestrator');
      
      try {
        const docs = await docOrchestrator.generateDocumentation(params);
        const qualityReport = await qualityOrchestrator.validateDocumentation(docs);
        
        if (qualityReport.issues.length > 0) {
          this.logger.warn('Documentation quality issues found', {
            issues: qualityReport.issues
          });
          await docOrchestrator.applyFixes(docs, qualityReport.issues);
        }
        
        this.logger.info('Documentation workflow completed', {
          qualityReport
        });
        
        return {
          documentation: docs,
          qualityReport
        };
      } catch (error) {
        this.logger.error('Documentation workflow failed', {
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    };
  }

  createTestingWorkflow() {
    return async (params) => {
      this.logger.info('Starting testing workflow', { params });
      
      const taskOrchestrator = this.orchestrators.get('TaskOrchestrator');
      const qualityOrchestrator = this.orchestrators.get('QualityOrchestrator');
      
      try {
        const testResults = await taskOrchestrator.runTests(params);
        const qualityReport = await qualityOrchestrator.validateTests(testResults);
        
        this.logger.info('Testing workflow completed', {
          qualityReport
        });
        
        return {
          testResults,
          qualityReport
        };
      } catch (error) {
        this.logger.error('Testing workflow failed', {
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    };
  }

  createDeploymentWorkflow() {
    return async (params) => {
      this.logger.info('Starting deployment workflow', { params });
      
      const taskOrchestrator = this.orchestrators.get('TaskOrchestrator');
      const qualityOrchestrator = this.orchestrators.get('QualityOrchestrator');
      
      try {
        const preDeployReport = await qualityOrchestrator.validateDeployment(params);
        
        if (preDeployReport.status === 'pass') {
          await taskOrchestrator.deploy(params);
          this.logger.info('Deployment completed successfully');
        } else {
          this.logger.warn('Deployment validation failed', {
            report: preDeployReport
          });
        }
        
        return {
          preDeployReport,
          deployed: preDeployReport.status === 'pass'
        };
      } catch (error) {
        this.logger.error('Deployment workflow failed', {
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    };
  }

  createMaintenanceWorkflow() {
    return async (params) => {
      this.logger.info('Starting maintenance workflow', { params });
      
      const taskOrchestrator = this.orchestrators.get('TaskOrchestrator');
      const debugOrchestrator = this.orchestrators.get('DebugOrchestrator');
      
      try {
        const maintenanceResults = await taskOrchestrator.runMaintenance(params);
        
        if (maintenanceResults.issues.length > 0) {
          this.logger.warn('Maintenance issues found', {
            issues: maintenanceResults.issues
          });
          await debugOrchestrator.analyzeIssues(maintenanceResults.issues);
        }
        
        this.logger.info('Maintenance workflow completed', {
          results: maintenanceResults
        });
        
        return maintenanceResults;
      } catch (error) {
        this.logger.error('Maintenance workflow failed', {
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    };
  }

  async executeWorkflow(workflowName, params) {
    if (this.runningTasks.size >= this.options.maxConcurrent) {
      const error = new Error('Maximum concurrent workflows limit reached');
      this.logger.error('Workflow execution failed', {
        workflowName,
        error: error.message
      });
      throw error;
    }

    const workflow = this.workflows.get(workflowName);
    if (!workflow) {
      const error = new Error(`Workflow ${workflowName} not found`);
      this.logger.error('Workflow execution failed', {
        workflowName,
        error: error.message
      });
      throw error;
    }

    this.runningTasks.set(workflowName, true);
    this.emit('workflowStarted', { workflowName, params });
    this.logger.info('Workflow started', { workflowName, params });

    try {
      await this.telemetryManager.startSpan('MetaOrchestrator.executeWorkflow');
      const result = await workflow(params);
      this.emit('workflowCompleted', { workflowName, result });
      this.logger.info('Workflow completed', { workflowName, result });
      await this.telemetryManager.endSpan('MetaOrchestrator.executeWorkflow');
      return result;
    } catch (error) {
      this.emit('workflowFailed', { workflowName, error });
      this.logger.error('Workflow failed', {
        workflowName,
        error: error.message,
        stack: error.stack
      });
      await this.telemetryManager.recordMetric('meta_orchestrator_error', 1, { workflowName });
      throw error;
    } finally {
      this.runningTasks.delete(workflowName);
    }
  }

  async handleOrchestratorError(name, error) {
    this.logger.error(`Orchestrator error: ${name}`, {
      error: error.message,
      stack: error.stack
    });
    this.emit('orchestratorError', { orchestrator: name, error });
    await this.telemetryManager.recordMetric('meta_orchestrator_error', 1, { name });
  }

  async handleOrchestratorComplete(name, result) {
    this.logger.info(`Orchestrator completed: ${name}`, { result });
    this.emit('orchestratorComplete', { orchestrator: name, result });
  }

  getOrchestrator(name) {
    return this.orchestrators.get(name);
  }

  getWorkflow(name) {
    return this.workflows.get(name);
  }

  getState() {
    return {
      orchestrators: Object.fromEntries(this.orchestrators),
      workflows: Object.fromEntries(this.workflows),
      state: Object.fromEntries(this.state),
      runningTasks: Array.from(this.runningTasks.keys()),
      metrics: Object.fromEntries(this.metrics)
    };
  }

  async saveState() {
    const statePath = path.join(__dirname, '../state/meta-orchestrator-state.json');
    const state = this.getState();
    await fs.writeFile(statePath, JSON.stringify(state, null, 2));
    this.logger.info('State saved', { statePath });
  }

  async loadState() {
    const statePath = path.join(__dirname, '../state/meta-orchestrator-state.json');
    try {
      const state = JSON.parse(await fs.readFile(statePath, 'utf8'));
      this.state = new Map(Object.entries(state.state));
      this.metrics = new Map(Object.entries(state.metrics));
      this.logger.info('State loaded', { statePath });
    } catch (error) {
      this.logger.warn('No saved state found');
    }
  }

  async cleanup() {
    this.logger.info('Cleaning up MetaOrchestrator');
    
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

  // --- Mesh Networking & PWA Endpoints (Stubs) ---

  /**
   * Discover peer kernels on the mesh network (stub)
   * TODO: Implement mesh peer discovery (libp2p, WebRTC, etc.)
   */
  async discoverPeers() {
    this.logger.info('Mesh peer discovery (stub)');
    // TODO: Implement mesh peer discovery logic
    return [];
  }

  /**
   * Sync state with mesh peers (stub)
   * TODO: Implement mesh state sync (CRDT, Yjs, GunDB, etc.)
   */
  async syncStateWithPeers() {
    this.logger.info('Mesh state sync (stub)');
    // TODO: Implement mesh state sync logic
    return true;
  }

  /**
   * PWA API endpoint (stub)
   * TODO: Expose system state, health, and suggestions for PWA dashboard
   */
  async getPwaDashboardData() {
    this.logger.info('PWA dashboard data endpoint (stub)');
    // TODO: Return live system map, health, and suggestion list
    return {
      state: this.getState(),
      health: Array.from(this.healthStatus.entries()),
      suggestions: [] // TODO: Pull from suggestion log/magic list
    };
  }
}

module.exports = MetaOrchestrator; 