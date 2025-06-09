const path = require('path');
const MetaOrchestrator = require('../meta-orchestrator');
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
// --- MOCK ORCHESTRATORS ---
function createMockOrchestrator(name) {
  return class MockOrchestrator {
    constructor(options, { logger, telemetryManager } = {}) {
      this.options = options;
      this.logger = logger;
      this.telemetryManager = telemetryManager;
      this.events = {};
    }
    async initialize() {
      if (this.logger && this.logger.info) this.logger.info(`Mock ${name} initialized`);
    }
    on(event, cb) { this.events[event] = cb; }
    emit(event, data) { if (this.events[event]) this.events[event](data); }
  };
}

function createMockOrchestratorWithLog(name) {
  return class MockOrchestrator {
    constructor(options, { logger, telemetryManager } = {}) {
      this.options = options;
      this.logger = logger;
      this.telemetryManager = telemetryManager;
      if (this.logger && this.logger.info) this.logger.info(`MockOrchestrator ${name} constructed`);
    }
    async initialize() { if (this.logger && this.logger.info) this.logger.info(`MockOrchestrator ${name} initialized`); }
    on() {}
    emit() {}
  };
}

// --- TESTS ---
describe('MetaOrchestrator (DI logging/telemetry, orchestratorOverrides)', () => {
  let metaOrchestrator, logger, telemetryManager, orchestratorOverrides;

  beforeAll(async () => {
    logger = new LogOrchestrator();
    await logger.initialize();
    telemetryManager = createMockTelemetry();
    orchestratorOverrides = {
      LogOrchestrator: createMockOrchestrator('LogOrchestrator'),
      DebugOrchestrator: createMockOrchestrator('DebugOrchestrator'),
      TaskOrchestrator: createMockOrchestrator('TaskOrchestrator'),
      DocumentationOrchestrator: createMockOrchestrator('DocumentationOrchestrator'),
      QualityOrchestrator: createMockOrchestrator('QualityOrchestrator'),
      AgentOrchestrator: createMockOrchestrator('AgentOrchestrator')
    };
    metaOrchestrator = new MetaOrchestrator({}, { logger, telemetryManager, orchestratorOverrides });
  });

  test('initializes and logs initialization', async () => {
    await metaOrchestrator.initialize();
    expect(logger.initialize).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Initializing MetaOrchestrator', expect.any(Object));
    expect(telemetryManager.startSpan).toHaveBeenCalledWith('MetaOrchestrator.initialize');
    expect(logger.info).toHaveBeenCalledWith('MetaOrchestrator initialized', expect.any(Object));
    expect(telemetryManager.endSpan).toHaveBeenCalledWith('MetaOrchestrator.initialize');
    // Should log sub-orchestrator initialization
    expect(logger.info).toHaveBeenCalledWith('Mock LogOrchestrator initialized');
    expect(logger.info).toHaveBeenCalledWith('Mock DebugOrchestrator initialized');
  });

  test('logs workflow execution and metrics', async () => {
    metaOrchestrator.workflows.set('testWorkflow', async () => {
      logger.info('Test workflow executed');
      return 'ok';
    });
    await metaOrchestrator.initialize();
    await metaOrchestrator.executeWorkflow('testWorkflow', {});
    expect(logger.info).toHaveBeenCalledWith('Workflow completed', expect.objectContaining({ workflowName: 'testWorkflow', result: 'ok' }));
    expect(telemetryManager.startSpan).toHaveBeenCalledWith('MetaOrchestrator.executeWorkflow');
    expect(telemetryManager.endSpan).toHaveBeenCalledWith('MetaOrchestrator.executeWorkflow');
  });

  test('logs error handling in workflow', async () => {
    metaOrchestrator.workflows.set('failWorkflow', async () => {
      throw new Error('Workflow failed');
    });
    await metaOrchestrator.initialize();
    await expect(metaOrchestrator.executeWorkflow('failWorkflow', {})).rejects.toThrow('Workflow failed');
    expect(logger.error).toHaveBeenCalledWith('Workflow execution failed', expect.objectContaining({ workflowName: 'failWorkflow', error: expect.any(String) }));
    expect(telemetryManager.recordMetric).toHaveBeenCalledWith('meta_orchestrator_error', 1, { workflowName: 'failWorkflow' });
  });

  test('logs DI override usage for sub-orchestrators', async () => {
    const MockLogOrchestrator = createMockOrchestratorWithLog('LogOrchestrator');
    orchestratorOverrides.LogOrchestrator = MockLogOrchestrator;
    metaOrchestrator = new MetaOrchestrator({}, { logger, telemetryManager, orchestratorOverrides });
    await metaOrchestrator.initialize();
    expect(logger.info).toHaveBeenCalledWith('MetaOrchestrator using DI override', expect.objectContaining({ orchestrator: 'LogOrchestrator', source: 'MetaOrchestrator' }));
  });

  // --- Pattern: All orchestrator/agent tests should inject mocks and use orchestratorOverrides for subcomponents ---
}); 