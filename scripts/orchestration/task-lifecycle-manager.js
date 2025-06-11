// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;
const TelemetryManager = require('./telemetry-manager');

class TaskLifecycleManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      archiveDir: options.archiveDir || 'project_meta/archives',
      contextDir: options.contextDir || 'project_meta/context',
      maxContextSize: options.maxContextSize || 1000,
      retentionPeriod: options.retentionPeriod || 30 * 24 * 60 * 60 * 1000 // 30 days
    };
    this.context = new Map();
    this.archivedTasks = new Set();
    this.telemetryManager = new TelemetryManager();
  }

  async initialize() {
    await Promise.all([
      fs.mkdir(this.options.archiveDir, { recursive: true }),
      fs.mkdir(this.options.contextDir, { recursive: true })
    ]);
    await this.loadContext();
    await this.telemetryManager.startSpan('TaskLifecycleManager.initialize');
    await this.telemetryManager.endSpan('TaskLifecycleManager.initialize');
  }

  async loadContext() {
    try {
      const files = await fs.readdir(this.options.contextDir);
      for (const file of files) {
        const content = await fs.readFile(path.join(this.options.contextDir, file), 'utf8');
        const context = JSON.parse(content);
        this.context.set(context.id, context);
      }
    } catch (error) {
      console.warn('No existing context found, starting fresh');
    }
  }

  async archiveTask(task, reason) {
    const archive = {
      task,
      archivedAt: new Date().toISOString(),
      reason,
      context: this.getRelevantContext(task)
    };

    const archivePath = path.join(
      this.options.archiveDir,
      `task_${task.taskId}_${Date.now()}.json`
    );

    await fs.writeFile(archivePath, JSON.stringify(archive, null, 2));
    this.archivedTasks.add(task.taskId);
    this.emit('taskArchived', { task, archive });
    await this.telemetryManager.recordMetric('task_archived', 1, { reason });
    return archive;
  }

  getRelevantContext(task) {
    const relevantContext = [];
    for (const [id, context] of this.context) {
      if (this.isContextRelevant(task, context)) {
        relevantContext.push(context);
      }
    }
    return relevantContext;
  }

  isContextRelevant(task, context) {
    return (
      context.relatedTaskIds?.includes(task.taskId) ||
      context.tags?.some(tag => task.tags?.includes(tag)) ||
      context.phase === task.relatedPlanSection
    );
  }

  async addContext(context) {
    const contextId = `ctx_${Date.now()}`;
    const contextWithId = {
      id: contextId,
      timestamp: new Date().toISOString(),
      ...context
    };

    this.context.set(contextId, contextWithId);
    await this.saveContext(contextId, contextWithId);
    this.emit('contextAdded', contextWithId);
    await this.telemetryManager.recordMetric('context_added', 1, { contextId: context.id });

    // Maintain context size limit
    if (this.context.size > this.options.maxContextSize) {
      await this.cleanupOldContext();
    }

    return contextId;
  }

  async saveContext(contextId, context) {
    const contextPath = path.join(
      this.options.contextDir,
      `${contextId}.json`
    );
    await fs.writeFile(contextPath, JSON.stringify(context, null, 2));
  }

  async cleanupOldContext() {
    const now = Date.now();
    for (const [id, context] of this.context) {
      const contextAge = now - new Date(context.timestamp).getTime();
      if (contextAge > this.options.retentionPeriod) {
        this.context.delete(id);
        await fs.unlink(path.join(this.options.contextDir, `${id}.json`));
      }
    }
  }

  async getTaskHistory(taskId) {
    const archives = await fs.readdir(this.options.archiveDir);
    const taskArchives = archives.filter(file => file.startsWith(`task_${taskId}`));
    
    return Promise.all(
      taskArchives.map(async file => {
        const content = await fs.readFile(path.join(this.options.archiveDir, file), 'utf8');
        return JSON.parse(content);
      })
    );
  }

  async cleanup() {
    await this.cleanupOldContext();
  }
}

module.exports = TaskLifecycleManager; 
