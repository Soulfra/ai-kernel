const EventEmitter = require('events');
const LogOrchestrator = require('./log-orchestrator');
const TelemetryManager = require('./telemetry-manager');

class SummarizerOrchestrator extends EventEmitter {
  constructor(options = {}, { logger, telemetryManager, orchestratorOverrides, writerOrchestrator } = {}) {
    super();
    this.options = {
      batchSize: options.batchSize || 10,
      ...options
    };
    this.logger = logger || new LogOrchestrator();
    this.telemetryManager = telemetryManager || new TelemetryManager();
    this.orchestratorOverrides = orchestratorOverrides || {};
    this.writerOrchestrator = writerOrchestrator || null;
    this.handlers = {};
    this.summaryQueue = [];
  }

  async initialize() {
    await this.logger.info('SummarizerOrchestrator initializing');
    this.registerDefaultHandlers();
    await this.telemetryManager.recordMetric('summarizer_orchestrator_initialized', 1);
    this.emit('initialized');
  }

  registerDefaultHandlers() {
    this.registerHandler('log', this.summarizeLogs.bind(this));
    this.registerHandler('error', this.summarizeErrors.bind(this));
    this.registerHandler('doc', this.summarizeDocs.bind(this));
    this.registerHandler('metrics', this.summarizeMetrics.bind(this));
    // Add more as needed
  }

  registerHandler(type, handler) {
    this.handlers[type] = handler;
  }

  async enqueueSummary(type, payload, metadata = {}) {
    this.summaryQueue.push({ type, payload, metadata, timestamp: new Date().toISOString() });
    await this.logger.info('Summary enqueued', { type, metadata });
    if (this.summaryQueue.length >= this.options.batchSize) {
      await this.processQueue();
    }
  }

  async processQueue() {
    if (this.summaryQueue.length === 0) return;
    const batch = this.summaryQueue.splice(0, this.options.batchSize);
    for (const item of batch) {
      const handler = this.handlers[item.type];
      if (handler) {
        const summary = await handler(item.payload, item.metadata);
        if (this.writerOrchestrator) {
          await this.writerOrchestrator.enqueueOutput('summary', summary, item.metadata);
        }
      } else {
        await this.logger.warn('No handler for summary type', { type: item.type });
      }
    }
    await this.telemetryManager.recordMetric('summarizer_summaries_processed', batch.length);
  }

  async summarizeLogs(payload, metadata) {
    // Pluggable summarization strategy (stub)
    return `Log Summary: ${JSON.stringify(payload)}`;
  }

  async summarizeErrors(payload, metadata) {
    // Pluggable summarization strategy (stub)
    return `Error Summary: ${JSON.stringify(payload)}`;
  }

  async summarizeDocs(payload, metadata) {
    // Pluggable summarization strategy (stub)
    return `Doc Summary: ${JSON.stringify(payload)}`;
  }

  async summarizeMetrics(payload, metadata) {
    // Pluggable summarization strategy (stub)
    return `Metrics Summary: ${JSON.stringify(payload)}`;
  }

  async finalize() {
    await this.logger.info('SummarizerOrchestrator finalizing summaries');
    await this.processQueue();
    await this.telemetryManager.recordMetric('summarizer_orchestrator_finalized', 1);
    this.emit('finalized');
  }

  async cleanup() {
    await this.logger.info('SummarizerOrchestrator cleanup');
    await this.processQueue();
    this.emit('cleanup');
  }
}

module.exports = SummarizerOrchestrator; 