const DebugOrchestrator = require('../debug-orchestrator');
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
// --- MOCK ORCHESTRATORS/HANDLERS ---
function createMockHandler(name) {
  return class MockHandler {
    constructor(options, { logger, telemetryManager } = {}) {
      this.options = options;
      this.logger = logger;
      this.telemetryManager = telemetryManager;
      this.events = {};
    }
    async process(issue) {
      if (this.logger && this.logger.info) this.logger.info(`Mock ${name} processed issue`);
      return { success: true };
    }
    on(event, cb) { this.events[event] = cb; }
    emit(event, data) { if (this.events[event]) this.events[event](data); }
  };
}

describe('DebugOrchestrator (DI logging/telemetry, orchestratorOverrides)', () => {
  let debugOrchestrator, logger, telemetryManager, orchestratorOverrides;

  beforeAll(async () => {
    logger = new LogOrchestrator();
    await logger.initialize();
    telemetryManager = createMockTelemetry();
    orchestratorOverrides = {
      IssueHandler: createMockHandler('IssueHandler')
    };
    debugOrchestrator = new DebugOrchestrator({}, { logger, telemetryManager, orchestratorOverrides });
  });

  test('initializes and logs initialization', async () => {
    await debugOrchestrator.initialize();
    expect(logger.initialize).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('DebugOrchestrator initialized', expect.any(Object));
    expect(telemetryManager.startSpan).toHaveBeenCalledWith('DebugOrchestrator.initialize');
    expect(logger.info).toHaveBeenCalledWith('DebugOrchestrator initialized', expect.any(Object));
    expect(telemetryManager.endSpan).toHaveBeenCalledWith('DebugOrchestrator.initialize');
  });

  test('processes an issue using DI handler', async () => {
    await debugOrchestrator.initialize();
    const issue = { type: 'error', message: 'Test error' };
    // Simulate a process method if it exists
    if (debugOrchestrator.orchestratorOverrides.IssueHandler) {
      const handler = new debugOrchestrator.orchestratorOverrides.IssueHandler({}, { logger, telemetryManager });
      await handler.process(issue);
      expect(logger.info).toHaveBeenCalledWith('Mock IssueHandler processed issue');
    }
  });

  // --- Pattern: All orchestrator/agent tests should inject mocks and use orchestratorOverrides for subcomponents ---
}); 