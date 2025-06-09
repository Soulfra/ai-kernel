// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;
const LogOrchestrator = require('./log-orchestrator');
const TelemetryManager = require('./telemetry-manager');
const BackupOrchestrator = require('./backup-orchestrator');

class DebugOrchestrator extends EventEmitter {
  /**
   * @param {object} options
   * @param {object} di - Dependency injection: { logger, telemetryManager, orchestratorOverrides, backupOrchestrator }
   * orchestratorOverrides: { [className]: OrchestratorClass }
   */
  constructor(options = {}, { logger, telemetryManager, orchestratorOverrides, backupOrchestrator } = {}) {
    super();
    this.options = {
      debugDir: options.debugDir || './logs/debug',
      errorThreshold: options.errorThreshold || 5,
      errorWindow: options.errorWindow || 60000,
      maxErrorHistory: options.maxErrorHistory || 1000,
      maxIssues: options.maxIssues || 1000,
      issueRetentionDays: options.issueRetentionDays || 30,
      enableAutoResolution: options.enableAutoResolution || true,
      ...options
    };
    this.logger = logger || new LogOrchestrator({
      logDir: path.join(__dirname, '../../logs/debug'),
      enableMetrics: true
    });
    this.telemetryManager = telemetryManager || new TelemetryManager();
    this.orchestratorOverrides = orchestratorOverrides || {};
    this.backupOrchestrator = backupOrchestrator || new BackupOrchestrator(this.options, { logger: this.logger, telemetryManager: this.telemetryManager });
    this.issues = new Map();
    this.resolutionStrategies = new Map();
    this.issueHistory = new Map();
    this.metrics = new Map();
    this.autoResolutionEnabled = this.options.enableAutoResolution;
    this.errorHistory = [];
    this.alerts = [];
    this.runningTasks = new Map();
  }

  async initialize() {
    try {
      await this.logger.initialize();
      await this.logger.info('Initializing DebugOrchestrator');
      await this.telemetryManager.startSpan('DebugOrchestrator.initialize');
      // Create debug directory
      await this.ensureDebugDirectory();
      // Initialize resolution strategies
      await this.initializeResolutionStrategies();
      // Set up global error handlers
      this.setupGlobalErrorHandlers();
      // Load existing issues
      await this.loadIssues();
      // Set up task event tracking
      this.setupTaskEventTracking();
      await this.logger.info('DebugOrchestrator initialized', {
        resolutionStrategyCount: this.resolutionStrategies.size,
        issueCount: this.issues.size
      });
      await this.telemetryManager.endSpan('DebugOrchestrator.initialize');
      this.emit('initialized');
    } catch (error) {
      await this.logger.error('Failed to initialize DebugOrchestrator', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async ensureDebugDirectory() {
    try {
      await fs.mkdir(this.options.debugDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async initializeResolutionStrategies() {
    // Core resolution strategies
    this.resolutionStrategies.set('retry', {
      resolve: async (issue) => {
        try {
          await this.retryOperation(issue);
          return { success: true, message: 'Operation retried successfully' };
        } catch (error) {
          return { success: false, message: error.message };
        }
      }
    });

    this.resolutionStrategies.set('rollback', {
      resolve: async (issue) => {
        try {
          await this.rollbackOperation(issue);
          return { success: true, message: 'Operation rolled back successfully' };
        } catch (error) {
          return { success: false, message: error.message };
        }
      }
    });

    this.resolutionStrategies.set('cleanup', {
      resolve: async (issue) => {
        try {
          await this.cleanupOperation(issue);
          return { success: true, message: 'Operation cleaned up successfully' };
        } catch (error) {
          return { success: false, message: error.message };
        }
      }
    });
  }

  setupGlobalErrorHandlers() {
    process.on('uncaughtException', async (error) => {
      await this.handleError(error, 'uncaughtException');
    });

    process.on('unhandledRejection', async (reason) => {
      await this.handleError(reason, 'unhandledRejection');
    });
  }

  async handleError(error, source) {
    const issue = {
      id: this.generateIssueId(),
      timestamp: new Date().toISOString(),
      source,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      status: 'open',
      resolutionAttempts: 0
    };

    await this.addIssue(issue);

    if (this.autoResolutionEnabled) {
      await this.attemptAutoResolution(issue);
    }

    await this.telemetryManager.recordMetric('debug_error', 1, { source });

    this.emit('error', issue);
  }

  async addIssue(issue) {
    if (this.issues.size >= this.options.maxIssues) {
      await this.cleanupOldIssues();
    }

    this.issues.set(issue.id, issue);
    this.issueHistory.set(issue.id, [{
      timestamp: new Date().toISOString(),
      action: 'created',
      details: issue
    }]);

    await this.saveIssues();
    await this.logger.info('New issue added', { issueId: issue.id });
  }

  async attemptAutoResolution(issue) {
    const strategy = this.determineResolutionStrategy(issue);
    if (!strategy) {
      await this.logger.warn('No resolution strategy found', { issueId: issue.id });
      return;
    }

    try {
      const result = await strategy.resolve(issue);
      await this.updateIssueStatus(issue.id, result.success ? 'resolved' : 'failed', result);
    } catch (error) {
      await this.logger.error('Auto-resolution failed', {
        issueId: issue.id,
        error: error.message
      });
    }
  }

  determineResolutionStrategy(issue) {
    // Simple strategy determination based on error type
    if (issue.error.name === 'TimeoutError') {
      return this.resolutionStrategies.get('retry');
    } else if (issue.error.name === 'ValidationError') {
      return this.resolutionStrategies.get('rollback');
    } else if (issue.error.name === 'ResourceError') {
      return this.resolutionStrategies.get('cleanup');
    }
    return null;
  }

  async updateIssueStatus(issueId, status, resolution = null) {
    const issue = this.issues.get(issueId);
    if (!issue) {
      throw new Error(`Issue ${issueId} not found`);
    }

    issue.status = status;
    issue.resolutionAttempts++;
    issue.lastResolutionAttempt = new Date().toISOString();
    if (resolution) {
      issue.resolution = resolution;
    }

    this.issueHistory.get(issueId).push({
      timestamp: new Date().toISOString(),
      action: 'status_update',
      details: { status, resolution }
    });

    await this.saveIssues();
    await this.logger.info('Issue status updated', { issueId, status });
  }

  async cleanupOldIssues() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.options.issueRetentionDays);

    for (const [id, issue] of this.issues) {
      if (new Date(issue.timestamp) < cutoffDate) {
        this.issues.delete(id);
        this.issueHistory.delete(id);
      }
    }

    await this.saveIssues();
  }

  async saveIssues() {
    const issuesPath = path.join(this.options.debugDir, 'issues.json');
    const historyPath = path.join(this.options.debugDir, 'issue-history.json');

    await fs.writeFile(issuesPath, JSON.stringify(Object.fromEntries(this.issues), null, 2));
    await fs.writeFile(historyPath, JSON.stringify(Object.fromEntries(this.issueHistory), null, 2));
  }

  async loadIssues() {
    const issuesPath = path.join(this.options.debugDir, 'issues.json');
    const historyPath = path.join(this.options.debugDir, 'issue-history.json');

    try {
      const issuesData = await fs.readFile(issuesPath, 'utf8');
      const historyData = await fs.readFile(historyPath, 'utf8');

      this.issues = new Map(Object.entries(JSON.parse(issuesData)));
      this.issueHistory = new Map(Object.entries(JSON.parse(historyData)));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  generateIssueId() {
    return `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async retryOperation(issue) {
    // Implement retry logic based on issue type
    await this.logger.info('Retrying operation', { issueId: issue.id });
  }

  async rollbackOperation(issue) {
    // Require a valid backup before rollback
    await this.backupOrchestrator.ensureSafeBackup({ scope: 'full', dryRun: false, approval: true });
    // Implement rollback logic based on issue type
    await this.logger.info('Rolling back operation', { issueId: issue.id });
  }

  async cleanupOperation(issue) {
    // Implement cleanup logic based on issue type
    await this.logger.info('Cleaning up operation', { issueId: issue.id });
  }

  getIssue(issueId) {
    return this.issues.get(issueId);
  }

  getIssueHistory(issueId) {
    return this.issueHistory.get(issueId) || [];
  }

  getMetrics() {
    return {
      totalIssues: this.issues.size,
      openIssues: Array.from(this.issues.values()).filter(i => i.status === 'open').length,
      resolvedIssues: Array.from(this.issues.values()).filter(i => i.status === 'resolved').length,
      failedResolutions: Array.from(this.issues.values()).filter(i => i.status === 'failed').length
    };
  }

  async cleanup() {
    // Require a valid backup before cleanup or destructive operations
    await this.backupOrchestrator.ensureSafeBackup({ scope: 'full', dryRun: false, approval: true });
    await this.logger.info('Cleaning up DebugOrchestrator');
    
    // Remove global error handlers
    process.removeListener('uncaughtException', this.handleError);
    process.removeListener('unhandledRejection', this.handleError);
    
    // Save final state
    await this.saveIssues();
    
    await this.logger.cleanup();
    this.removeAllListeners();
  }

  setupTaskEventTracking() {
    // Listen for task events from orchestrator
    const orchestrator = this.options.orchestrator;
    if (!orchestrator) return;
    orchestrator.on('taskHeartbeat', ({ taskId, timestamp }) => {
      if (!this.runningTasks.has(taskId)) {
        // Start tracking
        const timeoutHandle = setTimeout(() => {
          this.handleTaskTimeout(taskId);
        }, 65000); // 65s
        this.runningTasks.set(taskId, { lastHeartbeat: timestamp, timeoutHandle });
      } else {
        // Update heartbeat
        const t = this.runningTasks.get(taskId);
        t.lastHeartbeat = timestamp;
        clearTimeout(t.timeoutHandle);
        t.timeoutHandle = setTimeout(() => {
          this.handleTaskTimeout(taskId);
        }, 65000);
      }
    });
    orchestrator.on('taskCompleted', ({ taskId }) => {
      this.clearTaskTracking(taskId);
    });
    orchestrator.on('taskFailed', ({ taskId, error }) => {
      this.clearTaskTracking(taskId);
    });
  }

  clearTaskTracking(taskId) {
    const t = this.runningTasks.get(taskId);
    if (t) {
      clearTimeout(t.timeoutHandle);
      this.runningTasks.delete(taskId);
    }
  }

  async handleTaskTimeout(taskId) {
    const error = new Error(`Task ${taskId} did not complete or error within 65s (non-event/timeout)`);
    error.name = 'TimeoutError';
    await this.handleError(error, 'taskTimeout');
    this.clearTaskTracking(taskId);
  }
}

module.exports = DebugOrchestrator; 
