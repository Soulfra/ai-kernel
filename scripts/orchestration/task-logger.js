// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const TelemetryManager = require('./telemetry-manager');

class TaskLogger extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      logDir: options.logDir || './logs/tasks',
      maxLogSize: options.maxLogSize || 10 * 1024 * 1024, // 10MB
      maxLogFiles: options.maxLogFiles || 10,
      versionFile: options.versionFile || './version.json',
      enableTelemetry: options.enableTelemetry || true,
      telemetryEndpoint: options.telemetryEndpoint || null,
      ...options
    };
    this.tasks = new Map();
    this.version = null;
    this.spans = new Map();
    this.traces = new Map();
    this.metrics = new Map();
    this.telemetryManager = new TelemetryManager();
  }

  async initialize() {
    try {
      // Create log directory
      await fs.mkdir(this.options.logDir, { recursive: true });
      
      // Load or create version file
      await this.loadVersion();
      
      // Initialize telemetry if enabled
      if (this.options.enableTelemetry) {
        await this.initializeTelemetry();
      }
      
      await this.telemetryManager.startSpan('TaskLogger.initialize');
      this.emit('initialized');
      await this.telemetryManager.endSpan('TaskLogger.initialize');
    } catch (error) {
      this.emit('error', new Error(`Failed to initialize TaskLogger: ${error.message}`));
      throw error;
    }
  }

  async initializeTelemetry() {
    // Initialize telemetry collection
    this.metrics.set('task_count', 0);
    this.metrics.set('error_count', 0);
    this.metrics.set('average_duration', 0);
    this.metrics.set('success_rate', 1.0);
  }

  async loadVersion() {
    try {
      const versionData = JSON.parse(await fs.readFile(this.options.versionFile, 'utf8'));
      this.version = versionData;
    } catch (error) {
      // Create new version file if it doesn't exist
      this.version = {
        major: 0,
        minor: 0,
        patch: 0,
        build: 0,
        lastUpdated: new Date().toISOString(),
        tasks: [],
        spans: [],
        traces: []
      };
      await this.saveVersion();
    }
  }

  async saveVersion() {
    await fs.writeFile(
      this.options.versionFile,
      JSON.stringify(this.version, null, 2)
    );
  }

  generateTaskId() {
    return `task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateSpanId() {
    return `span_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateTraceId() {
    return `trace_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  generateHash(content) {
    return crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex');
  }

  async startSpan(name, attributes = {}) {
    const spanId = this.generateSpanId();
    const startTime = Date.now();
    
    const span = {
      spanId,
      name,
      startTime,
      attributes,
      events: [],
      status: 'active'
    };

    this.spans.set(spanId, span);
    this.emit('spanStarted', { spanId, span });
    return spanId;
  }

  async endSpan(spanId, status = 'completed', error = null) {
    const span = this.spans.get(spanId);
    if (!span) {
      throw new Error(`Span ${spanId} not found`);
    }

    const endTime = Date.now();
    const duration = endTime - span.startTime;

    span.endTime = endTime;
    span.duration = duration;
    span.status = status;
    if (error) {
      span.error = error.message;
    }

    // Update metrics
    this.updateMetrics(span);

    this.emit('spanEnded', { spanId, span });
    return span;
  }

  async startTrace(name, attributes = {}) {
    const traceId = this.generateTraceId();
    const startTime = Date.now();
    
    const trace = {
      traceId,
      name,
      startTime,
      attributes,
      spans: [],
      status: 'active'
    };

    this.traces.set(traceId, trace);
    this.emit('traceStarted', { traceId, trace });
    return traceId;
  }

  async endTrace(traceId, status = 'completed', error = null) {
    const trace = this.traces.get(traceId);
    if (!trace) {
      throw new Error(`Trace ${traceId} not found`);
    }

    const endTime = Date.now();
    const duration = endTime - trace.startTime;

    trace.endTime = endTime;
    trace.duration = duration;
    trace.status = status;
    if (error) {
      trace.error = error.message;
    }

    this.emit('traceEnded', { traceId, trace });
    return trace;
  }

  async addSpanToTrace(traceId, spanId) {
    const trace = this.traces.get(traceId);
    const span = this.spans.get(spanId);
    
    if (!trace || !span) {
      throw new Error(`Trace ${traceId} or span ${spanId} not found`);
    }

    trace.spans.push(spanId);
    this.emit('spanAddedToTrace', { traceId, spanId });
  }

  updateMetrics(span) {
    const taskCount = this.metrics.get('task_count') + 1;
    const errorCount = this.metrics.get('error_count') + (span.status === 'error' ? 1 : 0);
    const totalDuration = this.metrics.get('average_duration') * (taskCount - 1) + span.duration;
    const averageDuration = totalDuration / taskCount;
    const successRate = 1 - (errorCount / taskCount);

    this.metrics.set('task_count', taskCount);
    this.metrics.set('error_count', errorCount);
    this.metrics.set('average_duration', averageDuration);
    this.metrics.set('success_rate', successRate);

    this.emit('metricsUpdated', {
      taskCount,
      errorCount,
      averageDuration,
      successRate
    });
  }

  async logTask(task) {
    const taskId = this.generateTaskId();
    const timestamp = new Date().toISOString();
    const traceId = await this.startTrace('task_execution', { taskType: task.type });
    const spanId = await this.startSpan('task_processing', { taskId, ...task });
    
    const taskLog = {
      taskId,
      timestamp,
      version: `${this.version.major}.${this.version.minor}.${this.version.patch}`,
      build: this.version.build,
      traceId,
      spanId,
      ...task,
      hash: this.generateHash(task)
    };

    try {
      // Add to in-memory map
      this.tasks.set(taskId, taskLog);

      // Add to version history
      this.version.tasks.push({
        taskId,
        type: task.type,
        status: task.status,
        timestamp,
        traceId,
        spanId
      });

      // Increment build number
      this.version.build++;
      this.version.lastUpdated = timestamp;

      // Save to file
      const logPath = path.join(this.options.logDir, `${taskId}.json`);
      await fs.writeFile(logPath, JSON.stringify(taskLog, null, 2));
      await this.saveVersion();

      await this.endSpan(spanId, 'completed');
      await this.endTrace(traceId, 'completed');

      await this.telemetryManager.recordMetric('task_logged', 1, { type: task.type });
      this.emit('taskLogged', { taskId, taskLog });
      return taskId;
    } catch (error) {
      await this.endSpan(spanId, 'error', error);
      await this.endTrace(traceId, 'error', error);
      throw error;
    }
  }

  async logOrchestratorEvent(orchestratorName, event) {
    const taskLog = {
      type: 'orchestrator_event',
      orchestrator: orchestratorName,
      event: event.type,
      details: event.details,
      status: 'completed',
      timestamp: new Date().toISOString()
    };

    await this.telemetryManager.recordMetric('orchestrator_event_logged', 1, { orchestratorName });
    return this.logTask(taskLog);
  }

  async logWorkflowEvent(workflowName, event) {
    const taskLog = {
      type: 'workflow_event',
      workflow: workflowName,
      event: event.type,
      details: event.details,
      status: 'completed',
      timestamp: new Date().toISOString()
    };

    return this.logTask(taskLog);
  }

  async getTaskHistory(options = {}) {
    const {
      limit = 100,
      offset = 0,
      type = null,
      status = null,
      orchestrator = null,
      workflow = null,
      includeSpans = false,
      includeTraces = false
    } = options;

    let tasks = Array.from(this.tasks.values());

    // Apply filters
    if (type) tasks = tasks.filter(t => t.type === type);
    if (status) tasks = tasks.filter(t => t.status === status);
    if (orchestrator) tasks = tasks.filter(t => t.orchestrator === orchestrator);
    if (workflow) tasks = tasks.filter(t => t.workflow === workflow);

    // Sort by timestamp descending
    tasks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Include spans and traces if requested
    if (includeSpans || includeTraces) {
      tasks = tasks.map(task => {
        const result = { ...task };
        if (includeSpans && task.spanId) {
          result.span = this.spans.get(task.spanId);
        }
        if (includeTraces && task.traceId) {
          result.trace = this.traces.get(task.traceId);
        }
        return result;
      });
    }

    // Apply pagination
    return tasks.slice(offset, offset + limit);
  }

  async getVersionHistory() {
    return {
      current: this.version,
      tasks: this.version.tasks,
      spans: Array.from(this.spans.values()),
      traces: Array.from(this.traces.values()),
      metrics: Object.fromEntries(this.metrics)
    };
  }

  async cleanup() {
    // Implement log rotation if needed
    const files = await fs.readdir(this.options.logDir);
    if (files.length > this.options.maxLogFiles) {
      const sortedFiles = files
        .map(file => ({
          name: file,
          time: fs.stat(path.join(this.options.logDir, file)).then(stat => stat.mtime.getTime())
        }))
        .sort((a, b) => b.time - a.time);

      const filesToDelete = sortedFiles.slice(this.options.maxLogFiles);
      for (const file of filesToDelete) {
        await fs.unlink(path.join(this.options.logDir, file.name));
      }
    }
  }
}

module.exports = TaskLogger; 
