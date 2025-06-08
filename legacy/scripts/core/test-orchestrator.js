const EventEmitter = require('events');

class TestOrchestrator extends EventEmitter {
  constructor(options = {}, { logger, debugOrchestrator, telemetryManager, writerOrchestrator, plannerOrchestrator } = {}) {
    super();
    this.options = options;
    this.logger = logger;
    this.debugOrchestrator = debugOrchestrator;
    this.telemetryManager = telemetryManager;
    this.writerOrchestrator = writerOrchestrator;
    this.plannerOrchestrator = plannerOrchestrator;
    this.testResults = [];
  }

  /**
   * Runs a suite of tests, emitting events for each phase.
   */
  async runTests(testCases = []) {
    this.emitTestEvent('testSuiteStarted', { count: testCases.length });
    if (this.plannerOrchestrator) {
      this.plannerOrchestrator.registerGoal({ title: 'E2E Test Suite', status: 'in_progress', details: 'Running E2E tests' });
    }
    for (const test of testCases) {
      await this.runTest(test);
    }
    this.emitTestEvent('testSuiteCompleted', { results: this.testResults });
    if (this.writerOrchestrator) {
      await this.writerOrchestrator.enqueueOutput('summary', this.generateSummary(), { type: 'test', timestamp: new Date().toISOString() });
    }
    if (this.plannerOrchestrator) {
      this.plannerOrchestrator.updateGoalStatus('E2E Test Suite', 'completed', 'All E2E tests run');
    }
  }

  /**
   * Runs a single test case, emitting events for each result.
   */
  async runTest(test) {
    this.emitTestEvent('testStarted', { name: test.name });
    if (this.plannerOrchestrator) {
      this.plannerOrchestrator.registerGoal({ title: `Test: ${test.name}`, status: 'in_progress', details: test.description });
    }
    let result = { name: test.name, status: 'unknown', error: null };
    try {
      await test.fn();
      result.status = 'passed';
      this.emitTestEvent('testPassed', { name: test.name });
      if (this.logger) await this.logger.info(`Test passed: ${test.name}`);
      if (this.telemetryManager) await this.telemetryManager.recordMetric('test_passed', 1, { name: test.name });
      if (this.plannerOrchestrator) this.plannerOrchestrator.updateGoalStatus(`Test: ${test.name}`, 'completed', 'Test passed');
    } catch (err) {
      result.status = 'failed';
      result.error = err.message;
      this.emitTestEvent('testFailed', { name: test.name, error: err.message });
      if (this.logger) await this.logger.error(`Test failed: ${test.name}`, { error: err.message });
      if (this.debugOrchestrator) this.debugOrchestrator.emit('error', { message: err.message, test: test.name });
      if (this.telemetryManager) await this.telemetryManager.recordError(`Test failed: ${test.name}`, { error: err.message });
      if (this.plannerOrchestrator) this.plannerOrchestrator.updateGoalStatus(`Test: ${test.name}`, 'failed', err.message);
    }
    this.testResults.push(result);
  }

  /**
   * Emits a structured test event to all orchestrators.
   */
  emitTestEvent(type, payload) {
    this.emit(type, payload);
    if (this.logger) this.logger.info(`[TestOrchestrator] ${type}`, payload);
    if (this.telemetryManager) this.telemetryManager.recordMetric(`test_${type}`, 1, payload);
    if (this.writerOrchestrator && (type === 'testSuiteCompleted' || type === 'testFailed')) {
      this.writerOrchestrator.enqueueOutput('log', `[TestOrchestrator] ${type}: ${JSON.stringify(payload)}`, { type: 'test', timestamp: new Date().toISOString() });
    }
    if (this.plannerOrchestrator && type === 'testFailed') {
      this.plannerOrchestrator.registerGoal({ title: `Test Failure: ${payload.name}`, status: 'failed', details: payload.error });
    }
  }

  /**
   * Generates a summary of test results.
   */
  generateSummary() {
    const passed = this.testResults.filter(r => r.status === 'passed').length;
    const failed = this.testResults.filter(r => r.status === 'failed').length;
    return `# Test Suite Summary\n\n- Passed: ${passed}\n- Failed: ${failed}\n- Total: ${this.testResults.length}`;
  }
}

module.exports = TestOrchestrator; 