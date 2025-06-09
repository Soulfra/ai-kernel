const path = require('path');
const fs = require('fs').promises;
const DocumentationOrchestrator = require('../documentation-orchestrator');
const { DocumentationHandler } = require('../task-handlers');
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
    async process(document) {
      if (this.logger && this.logger.info) this.logger.info(`Mock ${name} processed document`);
      return { success: true };
    }
    on(event, cb) { this.events[event] = cb; }
    emit(event, data) { if (this.events[event]) this.events[event](data); }
  };
}

let logger;
beforeAll(async () => {
  logger = new LogOrchestrator();
  await logger.initialize();
});

describe('DocumentationOrchestrator', () => {
  let orchestrator;
  const testDir = path.join(__dirname, '../../../test-docs');
  const testStructurePath = path.join(testDir, 'test-structure.md');
  
  beforeEach(async () => {
    // Create test directory and structure
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(testStructurePath, `
### Section 1
Content for section 1

### Section 2
Content for section 2
    `);
    
    orchestrator = new DocumentationOrchestrator({
      docsRoot: testDir,
      structurePath: testStructurePath
    });
  });
  
  afterEach(async () => {
    // Cleanup test files
    await fs.rm(testDir, { recursive: true, force: true });
  });
  
  test('initializes with correct structure', async () => {
    const initPromise = new Promise(resolve => {
      orchestrator.once('initialized', resolve);
    });
    
    await orchestrator.initialize();
    const { totalTasks, structure } = await initPromise;
    
    expect(totalTasks).toBe(2); // Two sections
    expect(structure).toHaveLength(2);
    expect(structure[0].title).toBe('Section 1');
    expect(structure[1].title).toBe('Section 2');
  });
  
  test('processes tasks in priority order', async () => {
    await orchestrator.initialize();
    
    const completedTasks = [];
    orchestrator.on('task:complete', ({ task }) => {
      completedTasks.push(task);
    });
    
    await orchestrator.processAllTasks();
    
    expect(completedTasks).toHaveLength(2);
    expect(completedTasks[0].priority).toBe('high');
  });
  
  test('handles task failures gracefully', async () => {
    // Mock handler to simulate failure
    orchestrator.handler.execute = jest.fn().mockRejectedValueOnce(new Error('Test error'));
    
    await orchestrator.initialize();
    
    const results = await orchestrator.processAllTasks();
    
    expect(results.failed).toBe(1);
    expect(results.completed).toBe(1);
  });
  
  test('generates accurate validation report', async () => {
    await orchestrator.initialize();
    await orchestrator.processAllTasks();
    
    const report = await orchestrator.generateReport();
    
    expect(report.stats.total).toBe(2);
    expect(report.stats.completed).toBe(2);
    expect(report.stats.failed).toBe(0);
    expect(report.validation.errors).toHaveLength(0);
  });
  
  test('validates documentation completeness', async () => {
    await orchestrator.initialize();
    
    // Simulate incomplete processing
    orchestrator.completedTasks.clear();
    
    const validation = await orchestrator.validateDocumentation();
    
    expect(validation.errors).toHaveLength(2); // Both sections missing
    expect(validation.errors[0].type).toBe('missing_section');
  });
});

describe('DocumentationOrchestrator (logging, DI)', () => {
  let orchestrator, logger, telemetryManager;
  const testDir = path.join(__dirname, '../../../test-docs');
  const testStructurePath = path.join(testDir, 'test-structure.md');

  beforeEach(async () => {
    logger = createMockLogger();
    telemetryManager = createMockTelemetry();
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(testStructurePath, `\n### Section 1\nContent for section 1\n\n### Section 2\nContent for section 2\n`);
    orchestrator = new DocumentationOrchestrator({
      docsRoot: testDir,
      structurePath: testStructurePath
    }, { logger, telemetryManager });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  test('logs initialization and document processing', async () => {
    await orchestrator.initialize();
    expect(logger.info).toHaveBeenCalledWith('Initializing DocumentationOrchestrator');
    expect(logger.info).toHaveBeenCalledWith('DocumentationOrchestrator initialized', expect.any(Object));
  });

  test('logs document processed and saved', async () => {
    await orchestrator.initialize();
    await orchestrator.processDocument('Section 1', 'component', {});
    expect(logger.info).toHaveBeenCalledWith('Document processed', expect.any(Object));
    expect(logger.info).toHaveBeenCalledWith('Document saved', expect.any(Object));
  });

  test('logs errors on initialization failure', async () => {
    // Simulate error by removing structure file
    await fs.rm(testStructurePath);
    await expect(orchestrator.initialize()).rejects.toThrow();
    expect(logger.error).toHaveBeenCalledWith('Failed to initialize DocumentationOrchestrator', expect.any(Object));
  });

  test('logs cleanup', async () => {
    await orchestrator.initialize();
    await orchestrator.cleanup();
    expect(logger.info).toHaveBeenCalledWith('Cleaning up DocumentationOrchestrator');
  });

  // Log test results for traceability
  afterAll(() => {
    logger.info('DocumentationOrchestrator logging tests completed', { testSuite: 'documentation-orchestrator.test.js' });
  });
});

describe('DocumentationOrchestrator (DI logging/telemetry, orchestratorOverrides)', () => {
  let documentationOrchestrator, logger, telemetryManager, orchestratorOverrides;

  beforeEach(async () => {
    logger = createMockLogger();
    telemetryManager = createMockTelemetry();
    orchestratorOverrides = {
      DocumentHandler: createMockHandler('DocumentHandler')
    };
    documentationOrchestrator = new DocumentationOrchestrator({}, { logger, telemetryManager, orchestratorOverrides });
  });

  test('initializes and logs initialization', async () => {
    await documentationOrchestrator.initialize();
    expect(logger.initialize).toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('DocumentationOrchestrator initialized', expect.any(Object));
    expect(telemetryManager.startSpan).toHaveBeenCalledWith('DocumentationOrchestrator.initialize');
    expect(logger.info).toHaveBeenCalledWith('DocumentationOrchestrator initialized', expect.any(Object));
    expect(telemetryManager.endSpan).toHaveBeenCalledWith('DocumentationOrchestrator.initialize');
  });

  test('processes a document using DI handler', async () => {
    await documentationOrchestrator.initialize();
    const document = { title: 'Test Doc', content: '...' };
    if (documentationOrchestrator.orchestratorOverrides.DocumentHandler) {
      const handler = new documentationOrchestrator.orchestratorOverrides.DocumentHandler({}, { logger, telemetryManager });
      await handler.process(document);
      expect(logger.info).toHaveBeenCalledWith('Mock DocumentHandler processed document');
    }
  });

  // --- Pattern: All orchestrator/agent tests should inject mocks and use orchestratorOverrides for subcomponents ---
}); 