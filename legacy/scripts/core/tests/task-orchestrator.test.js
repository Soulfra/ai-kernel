const path = require('path');
const TaskOrchestrator = require('../task-orchestrator');
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
    async process(task) {
      if (this.logger && this.logger.info) this.logger.info(`Mock ${name} processed task`);
      return { success: true };
    }
    on(event, cb) { this.events[event] = cb; }
    emit(event, data) { if (this.events[event]) this.events[event](data); }
  };
}

function createMockDebugOrchestrator() {
  return class MockDebugOrchestrator {
    constructor(options, { logger, telemetryManager } = {}) {
      this.options = options;
      this.logger = logger;
      this.telemetryManager = telemetryManager;
      if (this.logger && this.logger.info) this.logger.info('MockDebugOrchestrator constructed');
    }
    async initialize() { if (this.logger && this.logger.info) this.logger.info('MockDebugOrchestrator initialized'); }
    on() {}
    emit() {}
  };
}

describe('TaskOrchestrator (DI logging/telemetry, orchestratorOverrides)', () => {
  let taskOrchestrator, logger, telemetryManager, orchestratorOverrides;

  beforeAll(async () => {
    logger = new LogOrchestrator();
    await logger.initialize();
    telemetryManager = createMockTelemetry();
    orchestratorOverrides = {
      DocumentationHandler: createMockHandler('DocumentationHandler'),
      ValidationHandler: createMockHandler('ValidationHandler'),
      MigrationHandler: createMockHandler('MigrationHandler')
    };
    taskOrchestrator = new TaskOrchestrator({}, { logger, telemetryManager, orchestratorOverrides });
  });

  test('initializes and logs initialization', async () => {
    await taskOrchestrator.initialize();
    expect(logger.initialize).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('TaskOrchestrator initialized', expect.any(Object));
    expect(telemetryManager.startSpan).toHaveBeenCalledWith('TaskOrchestrator.initialize');
    expect(logger.info).toHaveBeenCalledWith('TaskOrchestrator initialized', expect.any(Object));
    expect(telemetryManager.endSpan).toHaveBeenCalledWith('TaskOrchestrator.initialize');
  });

  test('processes a documentation task using DI handler', async () => {
    await taskOrchestrator.initialize();
    const task = { type: 'documentation', action: 'generate', target: 'api-docs' };
    await taskOrchestrator.addTask(task);
    await taskOrchestrator.processTaskQueue();
    expect(logger.info).toHaveBeenCalledWith('Mock DocumentationHandler processed task');
  });

  test('uses DI override for DebugOrchestrator and logs it', async () => {
    const MockDebugOrchestrator = createMockDebugOrchestrator();
    orchestratorOverrides.DebugOrchestrator = MockDebugOrchestrator;
    taskOrchestrator = new TaskOrchestrator({}, { logger, telemetryManager, orchestratorOverrides });
    expect(logger.info).toHaveBeenCalledWith('TaskOrchestrator using DI override for DebugOrchestrator', expect.objectContaining({ source: 'TaskOrchestrator' }));
  });

  // --- Pattern: All orchestrator/agent tests should inject mocks and use orchestratorOverrides for subcomponents ---
}); 