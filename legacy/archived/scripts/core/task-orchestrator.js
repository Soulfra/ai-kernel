const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;
const LogOrchestrator = require('./log-orchestrator');
const DebugOrchestrator = require('./debug-orchestrator');
const TelemetryManager = require('./telemetry-manager');
const { isDuplicateTask, mergeTask } = require('./task-deduplicator');
const BackupOrchestrator = require('./backup-orchestrator');
const logOrchestrator = new LogOrchestrator();
const telemetryManager = new TelemetryManager();

/**
 * TaskOrchestrator
 * Now supports dependency injection for logger and telemetryManager.
 * Usage:
 *   new TaskOrchestrator(options, { logger, telemetryManager })
 *   // Defaults to auto-logger and canonical TelemetryManager if not provided
 */
class TaskOrchestrator extends EventEmitter {
  /**
   * @param {object} options
   * @param {object} di - Dependency injection: { logger, telemetryManager, orchestratorOverrides, backupOrchestrator }
   * orchestratorOverrides: { [className]: OrchestratorClass }
   */
  constructor(options = {}, { logger, telemetryManager, orchestratorOverrides, backupOrchestrator } = {}) {
    super();
    this.options = {
      taskDir: options.taskDir || './tasks',
      maxConcurrent: options.maxConcurrent || 5,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      enableMetrics: options.enableMetrics || true,
      ...options
    };
    this.logger = logger || new LogOrchestrator({
      logDir: path.join(__dirname, '../../logs'),
      enableMetrics: this.options.enableMetrics
    });
    this.telemetryManager = telemetryManager || new TelemetryManager();
    this.orchestratorOverrides = orchestratorOverrides || {};
    this.backupOrchestrator = backupOrchestrator || new BackupOrchestrator(this.options, { logger: this.logger, telemetryManager: this.telemetryManager });

    // Use override for DebugOrchestrator if provided
    const DebugOrchestratorClass = this.orchestratorOverrides.DebugOrchestrator || require('./debug-orchestrator');
    this.debugger = new DebugOrchestratorClass({
      debugDir: path.join(__dirname, '../../debug'),
      enableAutoResolution: true
    }, { logger: this.logger, telemetryManager: this.telemetryManager });

    this.tasks = new Map();
    this.taskQueue = [];
    this.runningTasks = new Set();
    this.taskHistory = new Map();
    this.metrics = new Map();
    this.handlers = {}; // Will be populated in initialize()
  }

  async initialize() {
    try {
      await this.telemetryManager.startSpan('TaskOrchestrator.initialize');
      await this.logger.initialize();
      await this.debugger.initialize();
      if (this.orchestratorOverrides.DebugOrchestrator) {
        await this.logger.info('TaskOrchestrator using DI override for DebugOrchestrator', { source: 'TaskOrchestrator' });
      }
      await this.logger.info('Initializing TaskOrchestrator');

      // Handler registration (after logger is initialized)
      const handlers = require('./task-handlers');
      this.handlers = {};
      for (const [name, HandlerClass] of Object.entries(handlers)) {
        if (name.endsWith('Handler') && typeof HandlerClass === 'function') {
          const type = name.replace('Handler', '').toLowerCase();
          this.registerHandler(type, new HandlerClass({ logger: this.logger, telemetryManager: this.telemetryManager }));
        }
      }
      if (!this.handlers['errorcluster']) {
        const { ErrorClusterHandler } = handlers;
        this.registerHandler('errorcluster', new ErrorClusterHandler({ logger: this.logger, telemetryManager: this.telemetryManager }));
      }

      // Create task directory
      await this.ensureTaskDirectory();

      // Load existing tasks
      await this.loadTasks();

      // Set up task processing
      this.setupTaskProcessing();

      await this.logger.info('TaskOrchestrator initialized', {
        taskCount: this.tasks.size,
        maxConcurrent: this.options.maxConcurrent
      });

      await this.telemetryManager.endSpan('TaskOrchestrator.initialize');
      this.emit('initialized');
    } catch (error) {
      if (this.logger && this.logger.logStreams && this.logger.logStreams.size > 0) {
        await this.logger.error('Failed to initialize TaskOrchestrator', {
          error: error.message,
          stack: error.stack
        });
      } else {
        console.error('Failed to initialize TaskOrchestrator:', error);
      }
      throw error;
    }
  }

  async ensureTaskDirectory() {
    try {
      await fs.mkdir(this.options.taskDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  setupTaskProcessing() {
    // Process tasks in the queue
    setInterval(() => this.processTaskQueue(), 1000);
  }

  /**
   * Adds a new task to the orchestrator, deduplicating by hash.
   * If a duplicate exists, merges and updates the task instead of adding.
   * @param {Object} task - The task to add
   * @returns {string} taskId
   */
  async addTask(task) {
    const tasksArray = Array.from(this.tasks.values());
    if (isDuplicateTask(task, tasksArray)) {
      const existing = tasksArray.find(t => isDuplicateTask(task, [t]));
      const merged = mergeTask(task, existing);
      Object.assign(existing, merged);
      // Optionally emit an event or log deduplication
      this.emit('task:deduplicated', { task: merged });
      this.logger.info('Task added', { task });
      this.logger.warn('Duplicate task detected', { task });
      return existing.taskId;
    }

    const taskId = this.generateTaskId();
    const taskWithId = {
      ...task,
      id: taskId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      attempts: 0
    };

    this.tasks.set(taskId, taskWithId);
    this.taskQueue.push(taskId);
    this.taskHistory.set(taskId, [{
      timestamp: new Date().toISOString(),
      action: 'created',
      details: taskWithId
    }]);

    await this.saveTasks();
    await this.logger.info('New task added', { taskId, type: task.type });

    this.emit('taskAdded', taskWithId);
    this.logger.info('Task added', { task });
    return taskId;
  }

  async processTaskQueue() {
    // Require a valid backup before processing tasks that could alter system state
    await this.backupOrchestrator.ensureSafeBackup({ scope: 'full', dryRun: false, approval: true });
    if (this.runningTasks.size >= this.options.maxConcurrent) {
      return;
    }

    const nextTaskId = this.taskQueue.shift();
    if (!nextTaskId) {
      return;
    }

    const task = this.tasks.get(nextTaskId);
    if (!task) {
      return;
    }

    this.runningTasks.add(nextTaskId);
    this.executeTask(nextTaskId).catch(async error => {
      await this.logger.error('Task execution failed', {
        taskId: nextTaskId,
        error: error.message
      });
      this.logger.error('Task processing error', { error });
    });
  }

  async executeTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    let completed = false;
    let heartbeatInterval = null;
    let timeoutHandle = null;
    try {
      await this.telemetryManager.startSpan('TaskOrchestrator.executeTask');
      task.status = 'running';
      task.startedAt = new Date().toISOString();
      task.attempts++;

      await this.updateTaskStatus(taskId, 'running');

      // Heartbeat: emit every 5s while running
      heartbeatInterval = setInterval(() => {
        this.emit('taskHeartbeat', { taskId, timestamp: new Date().toISOString() });
      }, 5000);

      // Timeout: fail fast if not completed in 60s
      timeoutHandle = setTimeout(async () => {
        if (!completed) {
          const error = new Error(`Task ${taskId} timed out after 60s`);
          error.name = 'TimeoutError';
          await this.updateTaskStatus(taskId, 'failed', { error: error.message });
          this.emit('taskFailed', { taskId, error });
          await this.logger.error('Task timed out', { taskId, error: error.message });
        }
      }, 60000);

      const result = await this.runTask(task);
      completed = true;
      clearTimeout(timeoutHandle);
      clearInterval(heartbeatInterval);
      await this.updateTaskStatus(taskId, 'completed', result);
      this.emit('taskCompleted', { taskId, result });
      await this.telemetryManager.recordMetric('task_executed', 1, { type: task.type });
    } catch (error) {
      completed = true;
      clearTimeout(timeoutHandle);
      clearInterval(heartbeatInterval);
      if (task.attempts < this.options.retryAttempts) {
        task.status = 'pending';
        this.taskQueue.push(taskId);
        await this.updateTaskStatus(taskId, 'retrying', { error: error.message });
        this.emit('taskRetrying', { taskId, error });
      } else {
        await this.updateTaskStatus(taskId, 'failed', { error: error.message });
        this.emit('taskFailed', { taskId, error });
        await this.logger.error('Task failed after retries', { taskId, error: error.message });
      }
    } finally {
      this.runningTasks.delete(taskId);
      await this.telemetryManager.endSpan('TaskOrchestrator.executeTask');
      clearTimeout(timeoutHandle);
      clearInterval(heartbeatInterval);
    }
  }

  /**
   * Registers a handler for a given task type.
   * @param {string} type - Task type (e.g., 'migration', 'context-index')
   * @param {object} handler - Handler instance
   */
  registerHandler(type, handler) {
    if (!this.handlers) this.handlers = {};
    this.handlers[type] = handler;
  }

  async runTask(task) {
    if (this.handlers && this.handlers[task.type]) {
      return this.handlers[task.type].process(task);
    }
    switch (task.type) {
      case 'documentation':
        return this.runDocumentationTask(task);
      case 'validation':
        return this.runValidationTask(task);
      case 'migration':
        return this.runMigrationTask(task);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  async runDocumentationTask(task) {
    // Implement documentation task execution
    await this.logger.info('Running documentation task', { taskId: task.id });
    return { success: true };
  }

  async runValidationTask(task) {
    // Implement validation task execution
    await this.logger.info('Running validation task', { taskId: task.id });
    return { success: true };
  }

  async runMigrationTask(task) {
    // Implement migration task execution
    await this.logger.info('Running migration task', { taskId: task.id });
    return { success: true };
  }

  async updateTaskStatus(taskId, status, result = null) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = status;
    task.updatedAt = new Date().toISOString();
    if (result) {
      task.result = result;
    }

    this.taskHistory.get(taskId).push({
      timestamp: new Date().toISOString(),
      action: 'status_update',
      details: { status, result }
    });

    await this.saveTasks();
    await this.logger.info('Task status updated', { taskId, status });
  }

  async saveTasks() {
    const tasksPath = path.join(this.options.taskDir, 'tasks.json');
    const historyPath = path.join(this.options.taskDir, 'task-history.json');

    await fs.writeFile(tasksPath, JSON.stringify(Object.fromEntries(this.tasks), null, 2));
    await fs.writeFile(historyPath, JSON.stringify(Object.fromEntries(this.taskHistory), null, 2));
  }

  async loadTasks() {
    const tasksPath = path.join(this.options.taskDir, 'tasks.json');
    const historyPath = path.join(this.options.taskDir, 'task-history.json');

    try {
      const tasksData = await fs.readFile(tasksPath, 'utf8');
      const historyData = await fs.readFile(historyPath, 'utf8');

      this.tasks = new Map(Object.entries(JSON.parse(tasksData)));
      this.taskHistory = new Map(Object.entries(JSON.parse(historyData)));
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  getTaskHistory(taskId) {
    return this.taskHistory.get(taskId) || [];
  }

  getMetrics() {
    return {
      totalTasks: this.tasks.size,
      pendingTasks: this.taskQueue.length,
      runningTasks: this.runningTasks.size,
      completedTasks: Array.from(this.tasks.values()).filter(t => t.status === 'completed').length,
      failedTasks: Array.from(this.tasks.values()).filter(t => t.status === 'failed').length
    };
  }

  async cleanup() {
    await this.logger.info('Cleaning up TaskOrchestrator');
    
    // Save final state
    await this.saveTasks();
    
    await this.logger.cleanup();
    await this.debugger.cleanup();
    this.removeAllListeners();
  }
}

module.exports = TaskOrchestrator; 