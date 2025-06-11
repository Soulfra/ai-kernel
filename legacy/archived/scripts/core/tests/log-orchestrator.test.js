const LogOrchestrator = require('../log-orchestrator');
let logger;
beforeAll(async () => {
  logger = new LogOrchestrator();
  await logger.initialize();
});

// --- MOCK HANDLERS ---
function createMockHandler(name) {
  return class MockHandler {
    constructor(options) {
      this.options = options;
      this.events = {};
    }
    async process(logEntry) {
      if (this.options && this.options.mockLog) this.options.mockLog(`${name} processed log`);
      return { success: true };
    }
    on(event, cb) { this.events[event] = cb; }
    emit(event, data) { if (this.events[event]) this.events[event](data); }
  };
}

describe('LogOrchestrator (orchestratorOverrides DI)', () => {
  let logOrchestrator, orchestratorOverrides, mockLog;

  beforeEach(() => {
    mockLog = jest.fn();
    orchestratorOverrides = {
      LogHandler: createMockHandler('LogHandler')
    };
    logOrchestrator = new LogOrchestrator({ mockLog }, { orchestratorOverrides });
  });

  test('initializes and can use DI handler', async () => {
    await logOrchestrator.initialize();
    expect(typeof logOrchestrator.orchestratorOverrides.LogHandler).toBe('function');
    // Simulate a process method if it exists
    if (logOrchestrator.orchestratorOverrides.LogHandler) {
      const handler = new logOrchestrator.orchestratorOverrides.LogHandler({ mockLog });
      await handler.process({ level: 'info', message: 'Test log' });
      expect(mockLog).toHaveBeenCalledWith('LogHandler processed log');
    }
  });

  // --- Pattern: All orchestrator/agent tests should inject mocks and use orchestratorOverrides for subcomponents ---
}); 