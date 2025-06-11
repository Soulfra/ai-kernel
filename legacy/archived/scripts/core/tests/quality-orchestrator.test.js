const QualityOrchestrator = require('../quality-orchestrator');
const LogOrchestrator = require('../log-orchestrator');

// --- MOCK HELPERS FOR DI LOGGING/TELEMETRY ---
function createMockLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
    initialize: jest.fn(),
    cleanup: jest.fn()
  };
}
function createMockTelemetry() {
  return {
    startSpan: jest.fn(),
    endSpan: jest.fn(),
    recordMetric: jest.fn(),
    initialize: jest.fn(),
    cleanup: jest.fn()
  };
}
// --- MOCK HANDLERS ---
function createMockHandler(name) {
  return class MockHandler {
    constructor(options, { logger, telemetryManager } = {}) {
      this.options = options;
      this.logger = logger;
      this.telemetryManager = telemetryManager;
      this.events = {};
    }
    async process(metrics) {
      if (this.logger && this.logger.info) this.logger.info(`Mock ${name} processed metrics`);
      return { success: true };
    }
    on(event, cb) { this.events[event] = cb; }
    emit(event, data) { if (this.events[event]) this.events[event](data); }
  };
}

describe('QualityOrchestrator (DI logging/telemetry, orchestratorOverrides)', () => {
  let qualityOrchestrator, logger, telemetryManager, orchestratorOverrides;

  beforeAll(async () => {
    logger = new LogOrchestrator();
    await logger.initialize();
    telemetryManager = createMockTelemetry();
    orchestratorOverrides = {
      MetricsHandler: createMockHandler('MetricsHandler')
    };
    qualityOrchestrator = new QualityOrchestrator({}, { logger, telemetryManager, orchestratorOverrides });
  });

  test('initializes and logs initialization', async () => {
    await qualityOrchestrator.initialize();
    expect(logger.initialize).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('QualityOrchestrator initialized', expect.any(Object));
    expect(telemetryManager.startSpan).toHaveBeenCalledWith('QualityOrchestrator.initialize');
    expect(logger.info).toHaveBeenCalledWith('QualityOrchestrator initialized', expect.any(Object));
    expect(telemetryManager.endSpan).toHaveBeenCalledWith('QualityOrchestrator.initialize');
  });

  test('processes metrics using DI handler', async () => {
    await qualityOrchestrator.initialize();
    const metrics = { cpu: 50, memory: 60 };
    if (qualityOrchestrator.orchestratorOverrides.MetricsHandler) {
      const handler = new qualityOrchestrator.orchestratorOverrides.MetricsHandler({}, { logger, telemetryManager });
      await handler.process(metrics);
      expect(logger.info).toHaveBeenCalledWith('Mock MetricsHandler processed metrics');
    }
  });

  // --- Pattern: All orchestrator/agent tests should inject mocks and use orchestratorOverrides for subcomponents ---
}); 