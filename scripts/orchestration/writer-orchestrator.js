// @agent: diagnostics
// @orchestrator: recovery
// @origin: legacy-rescue
/**
 * WriterOrchestrator
 *
 * - Accepts fs and path as injectable dependencies for robust testability and orchestration.
 * - All file operations use this.fs and this.path, enabling full mocking and auditability.
 * - Designed for orchestration router and dynamic injection.
 */
const EventEmitter = require('events');
const LogOrchestrator = require('./log-orchestrator');
const TelemetryManager = require('./telemetry-manager');
const BackupOrchestrator = require('./backup-orchestrator');

function isImmutablePath(filePath) {
  return filePath.includes('core/templates/immutable');
}

function safeWrite(fs, filePath, content) {
  if (isImmutablePath(filePath)) {
    throw new Error('Attempt to write to immutable template layer: ' + filePath);
  }
  fs.writeFileSync(filePath, content);
}

class WriterOrchestrator extends EventEmitter {
  constructor(options = {}, deps = {}) {
    super();
    this.fs = deps.fs || require('fs');
    this.path = deps.path || require('path');
    this.logger = deps.logger || new LogOrchestrator();
    this.telemetryManager = deps.telemetryManager || new TelemetryManager();
    this.backupOrchestrator = deps.backupOrchestrator || new BackupOrchestrator();
    this.orchestratorOverrides = deps.orchestratorOverrides || {};
    this.auditLogger = deps.auditLogger;
    this.options = {
      outputDir: options.outputDir || this.path.join(__dirname, '../../logs/writer'),
      batchSize: options.batchSize || 10,
      ...options
    };
    this.handlers = {};
    this.outputQueue = [];
    this.auditLog = [];
    this.isFinalizing = false;
  }

  async initialize() {
    await this.logger.info('WriterOrchestrator initializing');
    this.fs.mkdirSync(this.options.outputDir, { recursive: true });
    this.registerDefaultHandlers();
    await this.telemetryManager.recordMetric('writer_orchestrator_initialized', 1);
    this.emit('initialized');
  }

  registerDefaultHandlers() {
    this.registerHandler('log', this.handleLogOutput.bind(this));
    this.registerHandler('doc', this.handleDocOutput.bind(this));
    this.registerHandler('summary', this.handleSummaryOutput.bind(this));
    this.registerHandler('error', this.handleErrorOutput.bind(this));
  }

  registerHandler(type, handler) {
    this.handlers[type] = handler;
  }

  async enqueueOutput(type, payload, metadata = {}) {
    this.outputQueue.push({ type, payload, metadata, timestamp: new Date().toISOString() });
    await this.logger.info('Output enqueued', { type, metadata });
    if (this.outputQueue.length >= this.options.batchSize) {
      await this.processQueue();
    }
  }

  async processQueue() {
    if (this.outputQueue.length === 0) return;
    await this.backupOrchestrator.ensureSafeBackup({ scope: 'writer', dryRun: false, approval: true });
    const batch = this.outputQueue.splice(0, this.options.batchSize);
    for (const item of batch) {
      const handler = this.handlers[item.type];
      if (handler) {
        await handler(item.payload, item.metadata);
        this.auditLog.push({ ...item, status: 'written' });
      } else {
        await this.logger.warn('No handler for output type', { type: item.type });
        this.auditLog.push({ ...item, status: 'skipped' });
      }
    }
    await this.telemetryManager.recordMetric('writer_outputs_processed', batch.length);
  }

  async handleLogOutput(payload, metadata) {
    const filePath = this.path.join(this.options.outputDir, 'logs.md');
    const entry = `---\ntype: log\ntimestamp: ${new Date().toISOString()}\n${JSON.stringify(metadata)}\n---\n${payload}\n`;
    this.fs.appendFileSync(filePath, entry);
  }

  async handleDocOutput(payload, metadata) {
    const filePath = this.path.join(this.options.outputDir, 'docs.md');
    const entry = `---\ntype: doc\ntimestamp: ${new Date().toISOString()}\n${JSON.stringify(metadata)}\n---\n${payload}\n`;
    this.fs.appendFileSync(filePath, entry);
  }

  async handleSummaryOutput(payload, metadata) {
    const filePath = this.path.join(this.options.outputDir, 'summaries.md');
    const entry = `---\ntype: summary\ntimestamp: ${new Date().toISOString()}\n${JSON.stringify(metadata)}\n---\n${payload}\n`;
    this.fs.appendFileSync(filePath, entry);
  }

  async handleErrorOutput(payload, metadata) {
    const filePath = this.path.join(this.options.outputDir, 'errors.md');
    const entry = `---\ntype: error\ntimestamp: ${new Date().toISOString()}\n${JSON.stringify(metadata)}\n---\n${payload}\n`;
    this.fs.appendFileSync(filePath, entry);
  }

  async finalize() {
    this.isFinalizing = true;
    await this.logger.info('WriterOrchestrator finalizing outputs');
    await this.processQueue();
    await this.telemetryManager.recordMetric('writer_orchestrator_finalized', 1);
    this.emit('finalized');
  }

  async cleanup() {
    await this.logger.info('WriterOrchestrator cleanup');
    await this.processQueue();
    this.emit('cleanup');
  }

  async generateOnboardingDocs() {
    const immutableDir = this.path.resolve(__dirname, '../../core/templates/immutable');
    const workingDir = this.path.resolve(process.cwd(), './');
    const files = this.fs.readdirSync(immutableDir);
    for (const file of files) {
      const src = this.path.join(immutableDir, file);
      const dest = this.path.join(workingDir, file);
      if (!this.fs.existsSync(dest)) {
        this.fs.copyFileSync(src, dest);
        await this.logAudit('onboarding-doc-generated', { file: dest });
      }
    }
    this.emit('onboardingDocsGenerated', { files });
  }

  async logAudit(action, details) {
    if (this.auditLogger) {
      await this.auditLogger.log(action, details);
    }
  }

  async writeOutput(filePath, content) {
    safeWrite(this.fs, filePath, content);
    await this.logAudit('output-written', { file: filePath });
  }
}

module.exports = WriterOrchestrator; 
