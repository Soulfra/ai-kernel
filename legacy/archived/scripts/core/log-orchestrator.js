const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const { createWriteStream } = require('fs');
const { Transform } = require('stream');
const TelemetryManager = require('./telemetry-manager');

class LogOrchestrator extends EventEmitter {
  /**
   * @param {object} options
   * @param {object} di - Dependency injection: { orchestratorOverrides }
   * orchestratorOverrides: { [className]: OrchestratorClass }
   */
  constructor(options = {}, { orchestratorOverrides } = {}) {
    super();
    this.options = {
      logDir: options.logDir || './logs',
      maxLogSize: options.maxLogSize || 1024 * 1024,
      maxLogFiles: options.maxLogFiles || 5,
      logLevels: options.logLevels || ['debug', 'info', 'warn', 'error', 'fatal'],
      enableRotation: options.enableRotation || true,
      enableMetrics: options.enableMetrics || true,
      ...options
    };
    this.orchestratorOverrides = orchestratorOverrides || {};
    this.logStreams = new Map();
    this.logCounts = new Map();
    this.metrics = new Map();
    this.telemetryManager = new TelemetryManager();
    this.rotationTimers = {};
    this.eventHandlers = {};
    this.initializeLogCounts();
  }

  initializeLogCounts() {
    for (const level of this.options.logLevels) {
      this.logCounts.set(level, 0);
    }
  }

  async initialize() {
    try {
      await this.ensureLogDirectory();
      await this.initializeLogStreams();
      
      if (this.options.enableRotation) {
        this.startRotationCheck();
      }

      await this.telemetryManager.startSpan('LogOrchestrator.initialize');

      this.emit('initialized', {
        logLevels: this.options.logLevels,
        logDir: this.options.logDir
      });

      await this.telemetryManager.endSpan('LogOrchestrator.initialize');
    } catch (error) {
      this.emit('error', new Error(`Failed to initialize LogOrchestrator: ${error.message}`));
      throw error;
    }
  }

  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.options.logDir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  async initializeLogStreams() {
    for (const level of this.options.logLevels) {
      const logPath = path.join(this.options.logDir, `${level}.log`);
      const stream = createWriteStream(logPath, { flags: 'a' });
      this.logStreams.set(level, { stream });
    }
  }

  startRotationCheck() {
    setInterval(() => {
      this.checkRotation();
    }, 60000); // Check every minute
  }

  async checkRotation() {
    for (const [level, { stream }] of this.logStreams) {
      const stats = await fs.stat(stream.path);
      if (stats.size >= this.options.maxLogSize) {
        await this.rotateLog(level);
      }
    }
  }

  async rotateLog(level) {
    const { stream } = this.logStreams.get(level);
    const logPath = stream.path;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedPath = `${logPath}.${timestamp}`;

    await new Promise(resolve => stream.end(resolve));
    await fs.rename(logPath, rotatedPath);

    const newStream = createWriteStream(logPath, { flags: 'a' });
    this.logStreams.set(level, { stream: newStream });

    await this.cleanupOldLogs(level);
    this.emit('logRotated', { level, rotatedPath });
  }

  async cleanupOldLogs(level) {
    const logDir = this.options.logDir;
    const files = await fs.readdir(logDir);
    const logFiles = files
      .filter(file => file.startsWith(`${level}.log.`))
      .map(file => ({
        name: file,
        path: path.join(logDir, file),
        time: fs.stat(path.join(logDir, file)).then(stat => stat.mtime.getTime())
      }));

    const sortedFiles = await Promise.all(logFiles);
    sortedFiles.sort((a, b) => b.time - a.time);

    for (let i = this.options.maxLogFiles; i < sortedFiles.length; i++) {
      await fs.unlink(sortedFiles[i].path);
    }
  }

  async log(level, message, metadata = {}) {
    if (!this.logStreams || !this.logStreams[level]) {
      await this.initialize();
    }
    if (!this.options.logLevels.includes(level)) {
      throw new Error(`Invalid log level: ${level}`);
    }
    const logStreamObj = this.logStreams.get(level);
    if (!logStreamObj) {
      throw new Error(
        `Log stream for level '${level}' is not initialized. Did you call await logger.initialize()?`
      );
    }
    const { stream } = logStreamObj;
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata
    };

    this.logCounts.set(level, this.logCounts.get(level) + 1);

    if (this.options.enableMetrics) {
      this.updateMetrics(level, logEntry);
    }

    const logString = JSON.stringify(logEntry) + '\n';
    stream.write(logString);

    this.emit('log', logEntry);

    if (this.options.enableRotation) {
      const stats = await fs.stat(stream.path);
      if (stats.size >= this.options.maxLogSize) {
        await this.rotateLog(level);
      }
    }

    await this.telemetryManager.recordMetric('log_event', 1, { level });
  }

  updateMetrics(level, logEntry) {
    const metrics = this.metrics.get(level) || {
      count: 0,
      lastTimestamp: null,
      averageInterval: 0
    };

    metrics.count++;
    if (metrics.lastTimestamp) {
      const interval = new Date(logEntry.timestamp) - new Date(metrics.lastTimestamp);
      metrics.averageInterval = (metrics.averageInterval * (metrics.count - 1) + interval) / metrics.count;
    }
    metrics.lastTimestamp = logEntry.timestamp;

    this.metrics.set(level, metrics);
  }

  async error(message, metadata = {}) {
    await this.log('error', message, metadata);
  }

  async warn(message, metadata = {}) {
    await this.log('warn', message, metadata);
  }

  async info(message, metadata = {}) {
    await this.log('info', message, metadata);
  }

  async debug(message, metadata = {}) {
    await this.log('debug', message, metadata);
  }

  async fatal(message, metadata = {}) {
    await this.log('fatal', message, metadata);
  }

  getLogStats() {
    return {
      counts: Object.fromEntries(this.logCounts),
      metrics: Object.fromEntries(this.metrics),
      streams: Array.from(this.logStreams.keys()).map(level => ({
        level,
        path: this.logStreams.get(level).stream.path
      }))
    };
  }

  async cleanup() {
    for (const { stream } of this.logStreams.values()) {
      await new Promise(resolve => stream.end(resolve));
    }
    this.removeAllListeners();
  }
}

module.exports = LogOrchestrator; 